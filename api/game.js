const usersDao = require('../functions/dao/users');
const gameEngine = require('../engine/gameEngine');
const placesDao = require('../functions/dao/places');
const { parseIntents, generateNarrative } = require('../llm/groq');

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

    if (!userExists || !hasName) {
      return res.json(await handleWelcome(id, text, userExists ? user : null));
    }

    if (!hasDifficulty) {
      return res.json(await handleDifficulty(id, text, user));
    }

    if (!text || !text.trim()) {
      return res.json({ text: '\u00bfQu\u00e9 quieres hacer, hidalgo?', intent: 'idle' });
    }

    const placeName = Object.keys(user.room)[0];
    const place = await placesDao.getPlaceById(placeName).catch(() => null);

    const intents = await parseIntents(text, place);
    console.log('Intents:', JSON.stringify(intents));

    const engineResult = await gameEngine.execute(intents, id, user);
    console.log('Engine:', JSON.stringify(engineResult));

    if (engineResult && engineResult.gameOver) {
      const gameOverText = [
        engineResult.imageUrl ? `<img src="${engineResult.imageUrl}">` : '',
        engineResult.message || '',
        engineResult.restartMessage || ''
      ].filter(Boolean).join('\n');
      return res.json({ text: gameOverText, intent: 'gameOver', gameOver: true });
    }

    const countIntents = require('../functions/utils/countIntents');
    const freshUser = await usersDao.getUserById(id);
    const helpHint = await countIntents.checkIfNeedHelp(id, freshUser, intents[0] && intents[0].action);

    const narrative = await generateNarrative({
      userText: text,
      engineResult,
      user: freshUser,
      helpHint
    });

    return res.json({ text: narrative, intent: intents[0] && intents[0].action });

  } catch (error) {
    console.error('game.js error:', error);
    return res.status(500).json({ text: 'Ha ocurrido un error inesperado en la aventura.', intent: 'error' });
  }
};

async function handleWelcome(id, text, user) {
  const name = text && text.trim();
  if (!name) {
    return {
      text: 'Hola aventurero! No s\u00e9 si eres un valiente o un inconsciente al saludarme, pero en fin... \u00bfQuieres embarcarte en esta aventura? Si es as\u00ed, dime tu nombre.',
      intent: 'welcome'
    };
  }
  await usersDao.addUser(id, name, { lat: 39.5137458, lng: -3.0046506 });
  return {
    text: `\u00a1${name}! Buen nombre para un hidalgo. Ahora elige tu nivel de dificultad: *facil*, *medio* o *dificil*.`,
    intent: 'setName',
    showDifficulty: true
  };
}

async function handleDifficulty(id, text, user) {
  const level = text && text.toLowerCase().trim();
  const validLevels = ['facil', 'medio', 'dificil'];
  if (!level || !validLevels.includes(level)) {
    return { text: 'Por favor elige entre *facil*, *medio* o *dificil*.', intent: 'difficulty', showDifficulty: true };
  }
  const capacityMap = { facil: 9999999, medio: 100, dificil: 50 };
  const difficulty = { level, maxCapacity: capacityMap[level] };
  await usersDao.updateUser(id, { ...user, difficulty });
  const { textByDifficulty } = require('../functions/utils/difficultyUtils');
  const place = await placesDao.getPlaceById('biblioteca');
  const userWithDifficulty = { ...user, difficulty };
  return {
    text: `Excelente, comenzar\u00e1s con dificultad *${level}*.\n<img src="${place.media.images[0]}">\n${textByDifficulty(place.description, userWithDifficulty)}`,
    intent: 'difficulty'
  };
}
