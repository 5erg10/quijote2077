const OpenAI = require('openai');
const placesDao = require('../functions/dao/places');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_ACTIONS = ['viajar', 'coger', 'tirar', 'comer', 'usar', 'examinar', 'inventario', 'ayuda', 'afirmar', 'negar', 'fallback'];

/**
 * Usa GPT para parsear el texto libre del usuario y extraer
 * una lista ordenada de intents estructurados.
 * Devuelve siempre un array de intents, aunque solo haya uno.
 */
async function parseIntent(text, user) {
  const placeNames = placesDao.getPlaceNames();
  const objectNames = placesDao.getItems();
  const currentPlace = Object.keys(user.room)[0];

  const systemPrompt = `Eres el analizador de intenciones de "Quijote 2077", una aventura conversacional.

Tu única tarea es extraer la intención del jugador del texto que escribe y devolverla en formato JSON estricto.
No generes texto narrativo. Solo JSON.

Lugares válidos del juego: ${placeNames.join(', ')}
Objetos válidos del juego: ${objectNames.join(', ')}
Lugar actual del jugador: ${currentPlace}

Acciones válidas:
- viajar: moverse a un lugar. Parámetro: "place" (nombre del lugar)
- coger: recoger un objeto. Parámetro: "object" (nombre del objeto)
- tirar: soltar un objeto del inventario. Parámetro: "object"
- comer: comer un objeto del inventario. Parámetro: "object"
- usar: usar/interactuar con algo del entorno. Parámetros: "action" y "object"
- examinar: examinar/revisar algo. Parámetro: "object"
- inventario: ver el inventario. Sin parámetros.
- ayuda: pedir ayuda. Sin parámetros.
- afirmar: respuesta afirmativa (sí, claro, por supuesto...). Sin parámetros.
- negar: respuesta negativa (no, nunca...). Sin parámetros.
- fallback: no se entiende la acción. Sin parámetros.

Si el jugador menciona varias acciones en una frase, devuelve un array con todas en orden.
Siempre devuelve un array JSON. Ejemplos:
[{"action": "viajar", "place": "biblioteca"}]
[{"action": "coger", "object": "espada"}, {"action": "viajar", "place": "comedor"}]
[{"action": "usar", "action_verb": "examinar", "object": "escalera"}]

IMPORTANTE: Responde SOLO con el array JSON, sin explicaciones, sin markdown, sin texto extra.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    max_tokens: 200,
    temperature: 0.1
  });

  const raw = response.choices[0].message.content.trim();
  
  try {
    const parsed = JSON.parse(raw);
    const intents = Array.isArray(parsed) ? parsed : [parsed];
    // Validar que las acciones sean válidas
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
