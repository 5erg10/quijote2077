const usersDao = require('../repositories/user.repository');
const placesDao = require('../repositories/place.repository');
const gameEngine = require('../engine/gameEngine');
const stringUtils = require('../utils/stringUtils');
const { parseIntents, generateNarrative } = require('./narrative.service');
const { callWithFallback } = require('./llm.service');
const countIntents = require('../utils/countIntents');

async function handleWelcome(id, text, user) {
  const name = text && text.trim();
  if (!name) {
    return {
      messages: [{
        text: 'Hola aventurero! No sé si eres un valiente o un inconsciente al entrar aqui, pero en fin... ¿Quieres embarcarte en esta aventura? Si me dices tu nombre lo tomare como un si.',
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
  const { textByDifficulty } = require('../utils/difficultyUtils');
  const place = await placesDao.getPlaceById('biblioteca');
  const userWithDifficulty = { ...user, difficulty };
  return {
    messages: [{
      text: `Excelente, comenzarás con dificultad *${level}*.\n<img src="${place.media.images[0]}">\n${textByDifficulty(place.description, userWithDifficulty)}`,
      intent: 'difficulty'
    }]
  };
}

async function handleGameplay(id, text, user) {
  if (!text || !text.trim()) {
    return { messages: [{ text: '¿Qué quieres hacer, hidalgo?', intent: 'idle' }] };
  }

  const placeName = Object.keys(user.room)[0];
  const place = await placesDao.getPlaceById(placeName).catch(() => null);

  const intents = await callWithFallback(client => parseIntents(text, place, client));
  console.log('Intents:', JSON.stringify(intents));

  const engineResults = await gameEngine.execute(intents, id, user);
  console.log('Engine:', JSON.stringify(engineResults));

  const freshUser = await usersDao.getUserById(id);

  const messages = [];

  for (const engineResult of engineResults) {
    let currentMessage = `${engineResult.imageUrl ? `<img src="${engineResult.imageUrl}"/>` : ''}<p>${engineResult.message ?? engineResult.placeDescription}</p>`;
    if (engineResult.gameOver) {
      const gameOverText = [
        engineResult.imageUrl ? `<img src="${engineResult.imageUrl}">` : '',
        engineResult.message || '',
        engineResult.restartMessage || ''
      ].filter(Boolean).join('\n');
      messages.push({ text: gameOverText, intent: 'gameOver', gameOver: true });
      break;
    }

    const objectsIncurrentPlace = engineResult.success ? Object.values(user.objectsList).filter(object => stringUtils.normalize(object.currentPlace) == stringUtils.normalize(engineResult.place)) : [];
    console.log('objects in room: ', objectsIncurrentPlace.map(obj => obj.name))
    objectsIncurrentPlace.forEach(obj => {
      currentMessage += !obj.jointToSuccess ? `<p>${obj.originDescription}</p>` : `<p>${obj.ordinaryDescription}</p>`;
    })
    const helpHint = await countIntents.checkIfNeedHelp(id, freshUser, engineResult.action);
    // const narrative = await callWithFallback(client => generateNarrative({
    //   llmClientConf: client,
    //   userText: text,
    //   engineResult,
    //   user: freshUser,
    //   helpHint
    // }));

    if (helpHint) currentMessage += `<p>${helpHint}</p>`

    messages.push({ text: currentMessage, intent: engineResult.action });
  }

  const hasGameOver = messages.some(m => m.gameOver);
  return { messages, gameOver: hasGameOver || false };
}

module.exports = { handleWelcome, handleDifficulty, handleGameplay };
