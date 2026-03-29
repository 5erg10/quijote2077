const usersDao = require('../repositories/user.repository');
const placesDao = require('../repositories/place.repository');
const gameEngine = require('../engine/gameEngine');
const { normalize } = require('../utils/stringUtils');
const { parseIntents, generateNarrative } = require('./narrative.service');
const { callWithFallback } = require('./llm.service');
const countIntents = require('../utils/countIntents');

async function launchWelcome(user) {
  const validLevels = ['facil', 'medio', 'dificil'];

  const { difficulty } = user;

  if (!difficulty.level || !validLevels.includes(difficulty.level)) {
    return {
      messages: [{ text: 'Por favor elige entre *facil*, *medio* o *dificil*.', intent: 'difficulty', showDifficulty: true }]
    };
  }

  const { textByDifficulty } = require('../utils/difficultyUtils');
  const place = await placesDao.getPlaceById('biblioteca');

  return {
    messages: [{
      text: `Excelente, comenzarás con dificultad <b>${difficulty.level}</b>.\n<img src="${place.media.images[0]}">\n${textByDifficulty(place.description, user)}`,
      intent: 'difficulty'
    }]
  };
}

async function handleGameplay(id, text, user) {

  if (!text || !text.trim()) {
    return { success: false, messages: [{ text: '¿Qué quieres hacer, hidalgo?', intent: 'idle' }] };
  }

  const currentPlaceName = user.currentRoom.id;

  const intents = await callWithFallback(client => parseIntents(text, currentPlaceName, client));
  
  console.log('Intents:', JSON.stringify(intents));

  const engineResults = await gameEngine.execute(intents, id, user);

  const freshUser = await usersDao.getUserById(id);

  const messages = [];

  for (const engineResult of engineResults) {
    
    let currentMessage = `${engineResult.imageUrl ? `<img src="${engineResult.imageUrl}"/>` : ''}${engineResult.message ?? engineResult.placeDescription}`;

    if (engineResult.gameOver) {
      const gameOverText = [
        engineResult.imageUrl ? `<img src="${engineResult.imageUrl}">` : '',
        engineResult.message || '',
        engineResult.restartMessage || ''
      ].filter(Boolean).join('\n');
      messages.push({ text: gameOverText, intent: 'gameOver', gameOver: true });
      break;
    }

    // if(!engineResult.objectsInPlace) {
    //   const objectsIncurrentPlace = engineResult.success ? Object.values(user.objectsList).filter(object => normalize(object.currentPlace) == normalize(engineResult.place)) : [];
    //   objectsIncurrentPlace.forEach(obj => {
    //     currentMessage += !obj.jointToSuccess ? `<br><br>${obj.originDescription}` : `<br><br>${obj.ordinaryDescription}`;
    //   });
    // }

    const helpHint = await countIntents.checkIfNeedHelp(id, freshUser, engineResult.action);

    // const narrative = await callWithFallback(client => generateNarrative({
    //   llmClientConf: client,
    //   userText: text,
    //   engineResult,
    //   user: freshUser,
    //   helpHint
    // }));

    if (helpHint) currentMessage += `<br><br>${helpHint}`

    messages.push({ text: currentMessage, intent: engineResult.action });
  }

  const hasGameOver = messages.some(m => m.gameOver);
  return { success: true, messages, gameOver: hasGameOver || false };
}

module.exports = { launchWelcome, handleGameplay };
