const { GoogleGenerativeAI } = require('@google/generative-ai');
const placesDao = require('../functions/dao/places');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Genera la respuesta narrativa final al usuario usando Gemini 2.0 Flash.
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

  const helpSection = helpHint
    ? `\nPISTA PARA EL JUGADOR (incl\u00fayla al final de forma natural): ${helpHint}`
    : '';

  const prompt = `Eres el narrador de "Quijote 2077", una aventura conversacional de texto ambientada en la \u00e9poca de El Quijote pero con toques retrofuturistas.

Tu estilo es humor\u00edstico, ir\u00f3nico y cervantino. Usa un lenguaje elegante pero accesible, con expresiones de la \u00e9poca cuando sea natural.
Nunca rompas la inmersi\u00f3n. Nunca menciones que eres una IA ni que hay un sistema inform\u00e1tico detr\u00e1s.

Estado actual del jugador:
- Nombre: ${user.userName || 'hidalgo'}
- Lugar actual: ${placeName}
- Descripci\u00f3n del lugar: ${placeDescription}
- Objetos visibles en el lugar: ${objectsInPlace}
- Acciones posibles aqu\u00ed: ${placeActions}
- Inventario del jugador: ${objectsInInventory}
- Energ\u00eda: ${user.hungry}/100
- Dificultad: ${(user.difficulty && user.difficulty.level) || 'normal'}

IMPORTANTE:
- Genera SOLO el texto de respuesta narrativa, sin etiquetas ni JSON.
- Si el resultado del motor incluye imageUrl, incl\u00fayla como <img src="URL"> al principio.
- Si hay m\u00faltiples acciones, narralas todas en orden.
- M\u00e1ximo 3 p\u00e1rrafos.${helpSection}

El jugador ha escrito: "${userText}"

Resultado del motor del juego:
${JSON.stringify(engineResult, null, 2)}

Genera la respuesta narrativa:`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      maxOutputTokens: 400,
      temperature: 0.75
    }
  });

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = { callLLM };
