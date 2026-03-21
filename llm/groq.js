const Groq = require('groq-sdk');
const placesDao = require('../functions/dao/places');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const VALID_ACTIONS = ['viajar', 'coger', 'tirar', 'comer', 'usar', 'examinar', 'inventario', 'ayuda', 'afirmar', 'negar', 'fallback'];

/**
 * Llamada UNIFICADA al LLM.
 * En un solo request extrae los intents del texto del usuario
 * Y genera la respuesta narrativa, devolviendo un objeto JSON con ambas cosas.
 * Esto reduce a la mitad el consumo de tokens y requests.
 */
async function processMessage({ userText, user, engineResult, helpHint }) {
  const placeName = Object.keys(user.room)[0];
  const place = await placesDao.getPlaceById(placeName).catch(() => null);
  const placeDescription = place ? place.description : '';
  const placeActions = place
    ? (place.actions || []).map(a => `${a.action} ${(a.object && a.object.name) || ''}`).join(', ')
    : '';

  const placeNames = placesDao.getPlaceNames();
  const objectNames = placesDao.getItems();
  const objectsInInventory = (user.objects || []).map(o => o.name).join(', ') || 'ninguno';
  const objectsInPlace = Object.values(user.objectsList || {})
    .filter(o => o.currentPlace === placeName)
    .map(o => o.name)
    .join(', ') || 'ninguno';

  const helpSection = helpHint
    ? `\nPISTA PARA EL JUGADOR (incluyela al final de la narrativa de forma natural): ${helpHint}`
    : '';

  // Fase 1: solo parsear intent (engineResult aun no existe)
  if (!engineResult) {
    const systemPrompt = `Eres el analizador de intenciones de "Quijote 2077", una aventura conversacional.
Tu unica tarea es extraer la intencion del jugador y devolver un array JSON estricto.
Responde SOLO con el array JSON, sin markdown, sin explicaciones, sin texto extra.

Lugares validos: ${placeNames.join(', ')}
Objetos validos: ${objectNames.join(', ')}
Lugar actual del jugador: ${placeName}

Acciones validas:
- viajar: parametro "place" (nombre del lugar)
- coger: parametro "object" (nombre del objeto)
- tirar: parametro "object"
- comer: parametro "object"
- usar: parametros "action_verb" y "object"
- examinar: parametro "object"
- inventario: sin parametros
- ayuda: sin parametros
- afirmar: respuesta afirmativa
- negar: respuesta negativa
- fallback: no se entiende

Ejemplos:
[{"action": "viajar", "place": "biblioteca"}]
[{"action": "coger", "object": "espada"}, {"action": "viajar", "place": "comedor"}]
[{"action": "examinar", "object": "escalera"}]`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      max_tokens: 200,
      temperature: 0.1
    });

    const raw = response.choices[0].message.content.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    try {
      const parsed = JSON.parse(raw);
      const intents = Array.isArray(parsed) ? parsed : [parsed];
      return {
        intents: intents.map(i => ({
          ...i,
          action: VALID_ACTIONS.includes(i.action) ? i.action : 'fallback'
        }))
      };
    } catch (e) {
      console.error('Error parseando intent JSON:', raw, e);
      return { intents: [{ action: 'fallback' }] };
    }
  }

  // Fase 2: generar narrativa con el resultado del engine
  const systemPrompt = `Eres el narrador de "Quijote 2077", una aventura conversacional de texto ambientada en la epoca de El Quijote con toques retrofuturistas.

Tu estilo es humoristico, ironico y cervantino. Usa lenguaje elegante pero accesible.
Nunca rompas la inmersion. Nunca menciones que eres una IA.

Estado actual del jugador:
- Nombre: ${user.userName || 'hidalgo'}
- Lugar actual: ${placeName}
- Descripcion del lugar: ${placeDescription}
- Objetos visibles en el lugar: ${objectsInPlace}
- Acciones posibles aqui: ${placeActions}
- Inventario: ${objectsInInventory}
- Energia: ${user.hungry}/100
- Dificultad: ${(user.difficulty && user.difficulty.level) || 'normal'}

REGLAS:
- Genera SOLO texto narrativo, sin JSON ni etiquetas extras.
- Si engineResult incluye imageUrl, incluye <img src="URL"> al principio.
- Si hay multiples acciones, narralas en orden.
- Maximo 3 parrafos cortos.${helpSection}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `El jugador escribio: "${userText}"\n\nResultado del motor:\n${JSON.stringify(engineResult, null, 2)}\n\nGenera la respuesta narrativa:`
      }
    ],
    max_tokens: 400,
    temperature: 0.75
  });

  return { narrative: response.choices[0].message.content.trim() };
}

module.exports = { processMessage };
