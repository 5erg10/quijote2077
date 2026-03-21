const usersDao = require('../functions/dao/users');
const gameEngine = require('../engine/gameEngine');
const { parseIntent } = require('../llm/intentParser');
const { callLLM } = require('../llm/openai');

module.exports = async (req, res) => {
  const { text, id } = req.body;

  if (!text || !id) {
    return res.status(400).json({ error: 'Se requieren los campos text e id' });
  }

  try {
    const user = await usersDao.getUserById(id);
    const isNewUser = !user || !user.userName;
    const isChoosingDifficulty = user && user.userName && !user.difficulty;

    // --- FLUJO ONBOARDING ---
    if (isNewUser) {
      return res.json(await handleWelcome(id, text, user));
    }

    if (isChoosingDifficulty) {
      return res.json(await handleDifficulty(id, text, user));
    }

    // --- FLUJO NORMAL: LLM interpreta y genera respuesta ---
    const intent = await parseIntent(text, user);
    console.log('Intent parsed:', JSON.stringify(intent));

    const engineResult = await gameEngine.execute(intent, id, user);
    console.log('Engine result:', JSON.stringify(engineResult));

    const narrative = await callLLM({
      userText: text,
      intent,
      engineResult,
      user
    });

    return res.json({ text: narrative, intent: intent.action });

  } catch (error) {
    console.error('game.js error:', error);
    return res.status(500).json({ text: 'Ha ocurrido un error inesperado en la aventura.', intent: 'error' });
  }
};

async function handleWelcome(id, text, user) {
  // Primera vez: texto libre = nombre del jugador
  const name = text.trim();
  if (!name) {
    return { text: '¡Bienvenido, valiente! ¿Cómo te llamas, hidalgo?', intent: 'welcome' };
  }
  // Guardamos el nombre y pedimos dificultad
  if (!user || Object.keys(user).length === 0) {
    // Mensaje inicial de bienvenida
    return { text: 'Hola aventurero! No sé si eres un valiente o un inconsciente al saludarme, pero en fin... ¿Quieres embarcarte en esta aventura? Si es así, dime tu nombre.', intent: 'welcome' };
  }
  // El usuario ya existe pero no tiene nombre aún: guardar nombre y pedir dificultad
  await usersDao.addUser(id, name, { lat: 39.5137458, lng: -3.0046506 });
  return {
    text: `¡${name}! Buen nombre para un hidalgo. Ahora elige tu nivel de dificultad: *facil*, *medio* o *dificil*.`,
    intent: 'setName',
    showDifficulty: true
  };
}

async function handleDifficulty(id, text, user) {
  const level = text.toLowerCase().trim();
  const validLevels = ['facil', 'medio', 'dificil'];

  if (!validLevels.includes(level)) {
    return { text: 'Por favor elige entre *facil*, *medio* o *dificil*.', intent: 'difficulty', showDifficulty: true };
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
