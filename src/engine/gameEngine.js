const travelAction = require('./actions/travel');
const takeAction = require('./actions/take');
const leaveAction = require('./actions/leave');
const eatAction = require('./actions/eat');
const contextAction = require('./actions/contextAction');
const inventoryAction = require('./actions/inventory');
const helpAction = require('./actions/help');
const countIntents = require('../utils/countIntents');
const usersDao = require('../repositories/user.repository');

const execute = async (intents, userId, user) => {
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

  return results;
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
      return await contextAction.execute(intent, userId, user);
  }
}

module.exports = { execute };
