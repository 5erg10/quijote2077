const Groq = require('groq-sdk');
const placesDao = require('../functions/dao/places');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const VALID_ACTIONS = ['viajar', 'coger', 'tirar', 'comer', 'usar', 'examinar', 'inventario', 'ayuda', 'afirmar', 'negar', 'fallback'];

/**
 * Llamada ÚNICA al LLM que hace dos cosas a la vez:
 * 1. Extrae los intents del texto del usuario (array JSON)
 * 2. Genera la respuesta narrativa basada en el resultado del motor
 *
 * Cuando se llama SIN engineResult -> modo parser (solo extrae intents)
 * Cuando se llama CON engineResult -> modo narrador (genera texto para el jugador)
 */
async function processMessage({ userText, user, engineResult = null, helpHint = null }) {
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

  const systemPrompt = `Eres el cerebro de "Quijote 2077", una aventura conversacional ambientada en la época de El Quijote con toques retrofuturistas.
Tienes DOS responsabilidades en cada turno:

1. ANALIZAR la intención del jugador y extraerla como JSON estructurado.
2. NARRAR la respuesta al jugador con estilo humorístico, irónico y cervantino.

Estado actual del juego:
- Jugador: ${user.userName || 'hidalgo'}
- Lugar: ${placeName}
- Descripción: ${placeDescription}
- Objetos visibles aquí: ${objectsInPlace}
- Acciones posibles aquí: ${placeActions}
- Inventario: ${objectsInInventory}
- Energía: ${user.hungry}/100
- Dificultad: ${(user.difficulty && user.difficulty.level) || 'normal'}
- Lugares conocidos: ${placeNames.join(', ')}
- Objetos del mundo: ${objectNames.join(', ')}

ACCIONES VÁLIDAS y sus SINÓNIMOS (mapea siempre al action indicado):

- viajar → ir a, caminar a, dirigirse a, moverse a, desplazarse a, marchar a, ir hacia
  JSON: {"action":"viajar","place":"nombre del lugar"}

- coger → agarrar, tomar, recoger, coger, llevarse, hacerse con, alzar, levantar
  JSON: {"action":"coger","object":"nombre del objeto"}

- tirar → soltar, dejar, abandonar, deshacerse de, arrojar, desechar, poner en el suelo
  JSON: {"action":"tirar","object":"nombre del objeto"}

- comer → ingerir, zampar, devorar, probar, saborear, beber (si es comida), tomar (si es comida)
  JSON: {"action":"comer","object":"nombre del objeto"}

- examinar → mirar, observar, inspeccionar, estudiar, revisar, leer, ojear, ver, contemplar, fijarse en, echar un vistazo, escuchar (si aplica al objeto), tocar, palpar, oler
  JSON: {"action":"examinar","object":"nombre del objeto"}

- usar → utilizar, emplear, golpear, abrir, cerrar, activar, accionar, mover, empujar, tirar de, encender, apagar, atacar con, clavar, insertar, aplicar
  JSON: {"action":"usar","action_verb":"verbo exacto usado","object":"nombre del objeto"}

- inventario → ver mi inventario, qué llevo, qué tengo, mis objetos, mi mochila, mis cosas
  JSON: {"action":"inventario"}

- ayuda → ayuda, socorro, no sé qué hacer, estoy perdido, pista, hint, qué hago
  JSON: {"action":"ayuda"}

- afirmar → sí, claro, por supuesto, desde luego, afirmativo, de acuerdo, ok, vale, quiero
  JSON: {"action":"afirmar"}

- negar → no, nunca, para nada, negativo, ni hablar, no quiero
  JSON: {"action":"negar"}

REGLA CRÍTICA DE MAPEO:
Si el jugador usa un verbo que es sinónimo de una acción válida, SIEMPRE mapéalo a esa acción.
Usa "fallback" SOLO cuando sea imposible determinar ninguna intención reconocible.
Ejemplo: "leo el libro" → examinar libro. "ojeo el libro" → examinar libro. "abro la puerta" → usar puerta.

RESPONDE SIEMPRE con este JSON exacto, sin texto extra, sin markdown:
{
  "intents": [/* array de intents extraídos */],
  "narrative": "/* respuesta narrativa, máximo 3 párrafos */"
}

REGLAS NARRATIVA:
- Nunca rompas la inmersión ni menciones que eres una IA.
- Si engineResult incluye imageUrl, pon <img src="URL"> al inicio de narrative.
- Si hay múltiples acciones, narralas todas en orden.
- Si hay helpHint, inclúyelo al final de forma natural.${helpHint ? '\n- Pista a incluir: ' + helpHint : ''}`;

  const userPrompt = engineResult
    ? `El jugador ha escrito: "${userText}"\n\nResultado del motor del juego:\n${JSON.stringify(engineResult, null, 2)}\n\nGenera el JSON con intents y narrative:`
    : `El jugador ha escrito: "${userText}"\n\nAún no hay resultado del motor. Extrae los intents y genera una narrative de espera breve si es necesario:`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 600,
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const raw = response.choices[0].message.content.trim();

  try {
    const parsed = JSON.parse(raw);
    const intents = (Array.isArray(parsed.intents) ? parsed.intents : [parsed.intents || { action: 'fallback' }])
      .map(intent => ({
        ...intent,
        action: VALID_ACTIONS.includes(intent && intent.action) ? intent.action : 'fallback'
      }));
    const narrative = parsed.narrative || '';
    return { intents, narrative };
  } catch (e) {
    console.error('Error parseando respuesta Groq:', raw, e);
    return {
      intents: [{ action: 'fallback' }],
      narrative: 'No os entiendo, valiente hidalgo. ¿Podéis repetirlo con otras palabras?'
    };
  }
}

module.exports = { processMessage };
