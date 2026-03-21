const { GoogleGenerativeAI } = require('@google/generative-ai');
const placesDao = require('../functions/dao/places');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const VALID_ACTIONS = ['viajar', 'coger', 'tirar', 'comer', 'usar', 'examinar', 'inventario', 'ayuda', 'afirmar', 'negar', 'fallback'];

/**
 * Usa Gemini para parsear el texto libre del usuario y extraer
 * una lista ordenada de intents estructurados en JSON.
 * Devuelve siempre un array de intents, aunque solo haya uno.
 */
async function parseIntent(text, user) {
  const placeNames = placesDao.getPlaceNames();
  const objectNames = placesDao.getItems();
  const currentPlace = Object.keys(user.room)[0];

  const prompt = `Eres el analizador de intenciones de "Quijote 2077", una aventura conversacional.
Tu única tarea es extraer la intención del jugador y devolver un array JSON estricto.
No generes texto narrativo. Responde SOLO con el array JSON, sin markdown, sin explicaciones.

Lugares válidos: ${placeNames.join(', ')}
Objetos válidos: ${objectNames.join(', ')}
Lugar actual del jugador: ${currentPlace}

Acciones válidas:
- viajar: parámetro "place"
- coger: parámetro "object"
- tirar: parámetro "object"
- comer: parámetro "object"
- usar: parámetros "action_verb" y "object"
- examinar: parámetro "object"
- inventario: sin parámetros
- ayuda: sin parámetros
- afirmar: respuesta afirmativa (sí, claro...)
- negar: respuesta negativa (no, nunca...)
- fallback: no se entiende

Ejemplos de respuesta:
[{"action": "viajar", "place": "biblioteca"}]
[{"action": "coger", "object": "espada"}, {"action": "viajar", "place": "comedor"}]
[{"action": "examinar", "object": "escalera"}]

Texto del jugador: "${text}"

Responde SOLO con el array JSON:`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      maxOutputTokens: 200,
      temperature: 0.1
    }
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(raw);
    const intents = Array.isArray(parsed) ? parsed : [parsed];
    return intents.map(intent => ({
      ...intent,
      action: VALID_ACTIONS.includes(intent.action) ? intent.action : 'fallback'
    }));
  } catch (e) {
    console.error('Error parseando intent JSON:', raw, e);
    return [{ action: 'fallback' }];
  }
}

module.exports = { parseIntent };
