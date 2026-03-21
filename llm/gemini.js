const { GoogleGenerativeAI } = require('@google/generative-ai');
const placesDao = require('../functions/dao/places');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Genera la respuesta narrativa final al usuario usando Gemini 1.5 Flash.
 * Recibe el resultado del motor del juego y lo convierte en texto
 * enriquecido con el tono y estilo del Quijote.
 */
async function callLLM({ userText, intents, engineResult, user, helpHint }) {
  const placeName = Object.keys(user.room)[0];
  const place = await placesDao.getPlaceById(placeName).catch(() => null);
  const placeDescription = place ? place.description : '';
  const placeActions = place
    ? (place.actions || []).map(a => `${a.action} ${(a.object && a.object.name) || ''}`).join(', ')
    : '';

  const objectsInInventory = (user.objects || []).map(o => o.name).join(', ') || 'ninguno';
  const objectsInPlace = Object.values(user.objectsList || {})
    .filter(o => o.currentPlace === placeName)
    .map(o => o.name)
    .join(', ') || 'ninguno';

  const helpSection = helpHint ? `\nPISTA PARA EL JUGADOR (inclúyla al final de la respuesta de forma natural): ${helpHint}` : '';

  const prompt = `Eres el narrador de "Quijote 2077", una aventura conversacional de texto ambientada en la época de El Quijote pero con toques retrofuturistas.

Tu estilo es humorístico, irónico y cervantino. Usa un lenguaje elegante pero accesible, con expresiones de la época cuando sea natural.
Nunca rompas la inmersión. Nunca menciones que eres una IA ni que hay un sistema informático detrás.

Estado actual del jugador:
- Nombre: ${user.userName || 'hidalgo'}
- Lugar actual: ${placeName}
- Descripción del lugar: ${placeDescription}
- Objetos visibles en el lugar: ${objectsInPlace}
- Acciones posibles aquí: ${placeActions}
- Inventario del jugador: ${objectsInInventory}
- Energía: ${user.hungry}/100
- Dificultad: ${(user.difficulty && user.difficulty.level) || 'normal'}

IMPORTANTE:
- Genera SOLO el texto de respuesta narrativa, sin etiquetas ni JSON.
- Si el resultado del motor incluye imageUrl, inclúyla como <img src="URL"> al principio.
- Si hay múltiples acciones, narralas todas en orden.
- Máximo 3 párrafos.${helpSection}

El jugador ha escrito: "${userText}"

Resultado del motor del juego:
${JSON.stringify(engineResult, null, 2)}

Genera la respuesta narrativa:`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      maxOutputTokens: 400,
      temperature: 0.75
    }
  });

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = { callLLM };
