const OpenAI = require('openai');
const placesDao = require('../functions/dao/places');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Genera la respuesta narrativa final al usuario.
 * Recibe el resultado del motor del juego y lo convierte en texto
 * enriquecido con el tono y estilo del Quijote.
 */
async function callLLM({ userText, intent, engineResult, user }) {
  const placeName = Object.keys(user.room)[0];
  const place = await placesDao.getPlaceById(placeName).catch(() => null);
  const placeDescription = place ? place.description : '';
  const placeActions = place ? (place.actions || []).map(a => `${a.action} ${a.object && a.object.name || ''}`).join(', ') : '';

  const objectsInInventory = (user.objects || []).map(o => o.name).join(', ') || 'ninguno';
  const objectsInPlace = Object.values(user.objectsList || {})
    .filter(o => o.currentPlace === placeName)
    .map(o => o.name)
    .join(', ') || 'ninguno';

  const systemPrompt = `Eres el narrador de "Quijote 2077", una aventura conversacional de texto ambientada en la época de El Quijote pero con toques retrofuturistas.

Tu estilo es humorístico, irónico y cervantino. Usa un lenguaje elegante pero accesible, con expresiones de la época cuando sea natural.
Nunca rompas la inmersión. Nunca menciones que eres una IA ni que hay un sistema informático detrás.

Estado actual del jugador:
- Nombre: ${user.userName || 'hidalgo'}
- Lugar actual: ${placeName}
- Descripción del lugar: ${placeDescription}
- Objetos en el lugar: ${objectsInPlace}
- Acciones posibles en este lugar: ${placeActions}
- Inventario del jugador: ${objectsInInventory}
- Energía: ${user.hungry}/100
- Dificultad: ${user.difficulty && user.difficulty.level || 'normal'}

IMPORTANTE: Genera SOLO el texto de respuesta narrativa, sin etiquetas ni JSON. 
Si el resultado del motor incluye una imagen (campo imageUrl), inclúyela en la respuesta como <img src="URL">.
Si hay múltiples acciones, naérralas todas en orden.
Máximo 3 párrafos.`;

  const userPrompt = `El jugador ha escrito: "${userText}"

Resultado del motor del juego:
${JSON.stringify(engineResult, null, 2)}

Genera la respuesta narrativa para el jugador.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 400,
    temperature: 0.75
  });

  return response.choices[0].message.content.trim();
}

module.exports = { callLLM };
