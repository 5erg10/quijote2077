const usersDao = require('../functions/dao/users');
const gameEngine = require('../engine/gameEngine');
const { parseIntent } = require('../llm/intentParser');
const { callLLM } = require('../llm/openai');

module.exports = async (req, res) => {
  const { text, id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Se requiere el campo id' });
  }

  try {
    const user = await usersDao.getUserById(id);
    const userExists = user && Object.keys(user).length > 0;
    const hasName = userExists && user.userName;
    const hasDifficulty = hasName && user.difficulty;

    // --- FASE 1: Usuario nuevo, sin datos en Firebase ---
    // texto vacío o primer mensaje → pedir nombre
    if (!userExists || !hasName) {
      return res.json(await handleWelcome(id, text, userExists ? user : null));
    }

    // --- FASE 2: Tiene nombre pero no ha elegido dificultad ---
    if (!hasDifficulty) {
      return res.json(await handleDifficulty(id, text, user));
    }

    // --- FASE 3: FLUJO NORMAL - LLM interpreta y genera respuesta ---
    if (!text || !text.trim()) {
      return res.json({ text: '¿Qué quieres hacer, hidalgo?', intent: 'idle' });
    }

    const intents = await parseIntent(text, user);
    console.log('Intents parsed:', JSON.stringify(intents));

    const engineResult = await gameEngine.execute(intents, id, user);
    console.log('Engine result:', JSON.stringify(engineResult));

    // Comprobar si hay ayuda adaptativa pendiente
    const countIntents = require('../functions/utils/countIntents');
    const freshUser = await usersDao.getUserById(id);
    const helpText = await countIntents.checkIfNeedHelp(id, freshUser, intents[0] && intents[0].action);

    const narrative = await callLLM({
      userText: text,
      intents,
      engineResult,
      user: freshUser,
      helpHint: helpText
    });

    return res.json({ text: narrative, intent: intents[0] && intents[0].action });

  } catch (error) {
    console.error('game.js error:', error);
    return res.status(500).json({ text: 'Ha ocurrido un error inesperado en la aventura.', intent: 'error' });
  }
};

async function handleWelcome(id, text, user) {
  const name = text && text.trim();

  // Sin nombre todavía: mostrar bienvenida
  if (!name) {
    return {
      text: 'Hola aventurero! No sé si eres un valiente o un inconsciente al saludarme, pero en fin... ¿Quieres embarcarte en esta aventura? Si es así, dime tu nombre.',
      intent: 'welcome'
    };
  }

  // Tiene nombre: crear usuario en Firebase y pedir dificultad
  await usersDao.addUser(id, name, { lat: 39.5137458, lng: -3.0046506 });

  return {
    text: `¡${name}! Buen nombre para un hidalgo. Ahora elige tu nivel de dificultad: *facil*, *medio* o *dificil*.`,
    intent: 'setName',
    showDifficulty: true
  };
}

async function handleDifficulty(id, text, user) {
  const level = text && text.toLowerCase().trim();
  const validLevels = ['facil', 'medio', 'dificil'];

  if (!level || !validLevels.includes(level)) {
    return {
      text: 'Por favor elige entre *facil*, *medio* o *dificil*.',
      intent: 'difficulty',
      showDifficulty: true
    };
  }

  const capacityMap = { facil: 9999999, medio: 100, dificil: 50 };
  const difficulty = { level, maxCapacity: capacityMap[level] };

  await usersDao.updateUser(id, { ...user, difficulty });

  const placesDao = require('../functions/dao/places');
  const { textByDifficulty } = require('../functions/utils/difficultyUtils');
  const place = await placesDao.getPlaceById('biblioteca');
  const userWithDifficulty = { ...user, difficulty };

  return {
    text: `Excelente, comenzarás con dificultad *${level}*.\n<img src="${place.media.images[0]}">\n${textByDifficulty(place.description, userWithDifficulty)}`,
    intent: 'difficulty'
  };
}
