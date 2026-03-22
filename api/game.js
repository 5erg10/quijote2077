require('dotenv').config();
const usersDao = require('../functions/dao/users');
const gameEngine = require('../engine/gameEngine');
const placesDao = require('../functions/dao/places');
const { parseIntents, generateNarrative } = require('../llm/llmEngine');
const config = require('../config').CONFIG;
const countIntents = require('../functions/utils/countIntents');
const groqEngime = require('groq-sdk');
const cerebrasengine = require('@cerebras/cerebras_cloud_sdk');

const groqClientConf = {
  client: new groqEngime({ apiKey: config.groqApiKey }),
  model: config.groqAiModel
};

const llmCerebrasClientConf = {
  client: new cerebrasengine({apiKey: config.cerebrasApiKey}),
  model: config.cerebrasModel
};

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
    const llmClientConf = groqClientConf;

    if (!userExists || !hasName) {
      return res.json(await handleWelcome(id, text, userExists ? user : null));
    }

    if (!hasDifficulty) {
      return res.json(await handleDifficulty(id, text, user));
    }

    if (!text || !text.trim()) {
      return res.json({ messages: [{ text: '¿Qué quieres hacer, hidalgo?', intent: 'idle' }] });
    }

    const placeName = Object.keys(user.room)[0];
    const place = await placesDao.getPlaceById(placeName).catch(() => null);

    const intents = await parseIntents(text, place, llmClientConf);
    console.log('Intents:', JSON.stringify(intents));

    const engineResults = await gameEngine.execute(intents, id, user);
    console.log('Engine:', JSON.stringify(engineResults));

    const freshUser = await usersDao.getUserById(id);

    const messages = [];

    for (const engineResult of engineResults) {
      if (engineResult.gameOver) {
        const gameOverText = [
          engineResult.imageUrl ? `<img src="${engineResult.imageUrl}">` : '',
          engineResult.message || '',
          engineResult.restartMessage || ''
        ].filter(Boolean).join('\n');
        messages.push({ text: gameOverText, intent: 'gameOver', gameOver: true });
        break;
      }

      const helpHint = await countIntents.checkIfNeedHelp(id, freshUser, engineResult.action);
      const narrative = await generateNarrative({
        llmClientConf,
        userText: text,
        engineResult,
        user: freshUser,
        helpHint
      });

      messages.push({ text: narrative, intent: engineResult.action });
    }

    const hasGameOver = messages.some(m => m.gameOver);
    return res.json({ messages, gameOver: hasGameOver || false });

  } catch (error) {
    console.error('game.js error:', error);
    return res.status(500).json({
      messages: [{ text: 'Ha ocurrido un error inesperado en la aventura.', intent: 'error' }]
    });
  }
};

async function handleWelcome(id, text, user) {
  const name = text && text.trim();
  if (!name) {
    return {
      messages: [{
        text: 'Hola aventurero! No sé si eres un valiente o un inconsciente al saludarme, pero en fin... ¿Quieres embarcarte en esta aventura? Si es así, dime tu nombre.',
        intent: 'welcome'
      }]
    };
  }
  await usersDao.addUser(id, name, { lat: 39.5137458, lng: -3.0046506 });
  return {
    messages: [{
      text: `¡${name}! Buen nombre para un hidalgo. Ahora elige tu nivel de dificultad: *facil*, *medio* o *dificil*.`,
      intent: 'setName',
      showDifficulty: true
    }]
  };
}

async function handleDifficulty(id, text, user) {
  const level = text && text.toLowerCase().trim();
  const validLevels = ['facil', 'medio', 'dificil'];
  if (!level || !validLevels.includes(level)) {
    return {
      messages: [{ text: 'Por favor elige entre *facil*, *medio* o *dificil*.', intent: 'difficulty', showDifficulty: true }]
    };
  }
  const capacityMap = { facil: 9999999, medio: 100, dificil: 50 };
  const difficulty = { level, maxCapacity: capacityMap[level] };
  await usersDao.updateUser(id, { ...user, difficulty });
  const { textByDifficulty } = require('../functions/utils/difficultyUtils');
  const place = await placesDao.getPlaceById('biblioteca');
  const userWithDifficulty = { ...user, difficulty };
  return {
    messages: [{
      text: `Excelente, comenzarás con dificultad *${level}*.\n<img src="${place.media.images[0]}">\n${textByDifficulty(place.description, userWithDifficulty)}`,
      intent: 'difficulty'
    }]
  };
}
