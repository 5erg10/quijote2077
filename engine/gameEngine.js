const travelAction = require('./actions/travel');
const takeAction = require('./actions/take');
const leaveAction = require('./actions/leave');
const eatAction = require('./actions/eat');
const contextAction = require('./actions/contextAction');
const inventoryAction = require('./actions/inventory');
const helpAction = require('./actions/help');
const countIntents = require('../functions/utils/countIntents');
const usersDao = require('../functions/dao/users');

// Acciones que tienen handler propio y nunca van a contextAction
const SYSTEM_ACTIONS = new Set(['viajar', 'coger', 'tirar', 'comer', 'inventario', 'ayuda', 'afirmar', 'negar', 'fallback']);

/**
 * Orquestador principal. Recibe uno o varios intents parseados por el LLM
 * y los ejecuta secuencialmente, acumulando resultados.
 */
async function execute(intents, userId, user) {
  const intentList = Array.isArray(intents) ? intents : [intents];
  const results = [];
  let currentUser = user;

  for (const intent of intentList) {
    if (results.length > 0) {
      currentUser = await usersDao.getUserById(userId);
    }

    const result = await executeSingle(intent, userId, currentUser);
    results.push(result);

    if (result.gameOver) break;
  }

  return results.length === 1 ? results[0] : { multiple: true, results };
}

async function executeSingle(intent, userId, user) {
  const { action } = intent;

  switch (action) {
    case 'viajar':
      return travelAction.execute(intent, userId, user);

    case 'coger':
      return takeAction.execute(intent, userId, user);

    case 'tirar':
      return leaveAction.execute(intent, userId, user);

    case 'comer':
      return eatAction.execute(intent, userId, user);

    case 'inventario':
      return inventoryAction.execute(intent, userId, user);

    case 'ayuda':
      return helpAction.execute(intent, userId, user);

    case 'afirmar':
    case 'negar':
      return { action, success: true, message: null };

    case 'fallback':
      await countIntents.count(userId);
      return { action: 'fallback', success: false, message: 'No entiendo esa acción.' };

    default:
      // Cualquier verbo específico de lugar (leer, abrir, golpear, llamar,
      // beber, poner, colocar, escalar, velar, atacar, cruzar, arreglar,
      // descansar, saltar, revisar, examinar, usar...) va a contextAction,
      // que busca la acción en places.json. Si no existe en el lugar actual
      // contextAction devuelve success:false con el mensaje adecuado.
      return contextAction.execute(intent, userId, user);
  }
}

module.exports = { execute };
