const Groq = require('groq-sdk');
const placesDao = require('../functions/dao/places');
const { buildActionContextPrompt, getValidActionsForPlace } = require('./actionContext');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Llamada ÚNICA al LLM.
 * Primera llamada (sin engineResult): extrae intents del texto libre.
 * Segunda llamada (con engineResult): genera la narrativa final.
 */
async function processMessage({ userText, user, engineResult = null, helpHint = null }) {
  const placeName = Object.keys(user.room)[0];
  const place = await placesDao.getPlaceById(placeName).catch(() => null);
  const placeDescription = place ? place.description : '';
  const placeNames = placesDao.getPlaceNames();
  const objectNames = placesDao.getItems();
  const objectsInInventory = (user.objects || []).map(o => o.name).join(', ') || 'ninguno';
  const objectsInPlace = Object.values(user.objectsList || {})
    .filter(o => o.currentPlace === placeName)
    .map(o => o.name)
    .join(', ') || 'ninguno';

  const validActions = getValidActionsForPlace(place);
  const actionContextBlock = buildActionContextPrompt(place, placeName);

  // Extraer el mensaje canónico del motor para pasarlo explícitamente al LLM
  const engineMessage = extractEngineMessage(engineResult);

  const systemPrompt = `Eres el narrador de "Quijote 2077", una aventura conversacional ambientada en la época de El Quijote con toques retrofuturistas.
Tienes DOS responsabilidades en cada turno:
1. ANALIZAR la intención del jugador y extraerla como JSON estructurado.
2. NARRAR la respuesta al jugador con estilo humorístico, irónico y cervantino.

Estado actual del juego:
- Jugador: ${user.userName || 'hidalgo'}
- Lugar: ${placeName}
- Descripción: ${placeDescription}
- Objetos visibles aquí: ${objectsInPlace}
- Inventario: ${objectsInInventory}
- Energía: ${user.hungry}/100
- Dificultad: ${(user.difficulty && user.difficulty.level) || 'normal'}
- Lugares a los que puedes viajar: ${placeNames.join(', ')}
- Objetos del mundo: ${objectNames.join(', ')}

${actionContextBlock}

ACCIONES DE SISTEMA (siempre disponibles):
- viajar → ir a, caminar hacia, dirigirse a, moverse a
  JSON: {"action":"viajar","place":"nombre"}
- coger → agarrar, tomar, recoger, llevarse, alzar
  JSON: {"action":"coger","object":"nombre"}
- tirar → soltar, dejar, abandonar, deshacerse de
  JSON: {"action":"tirar","object":"nombre"}
- comer → ingerir, zampar, devorar, probar
  JSON: {"action":"comer","object":"nombre"}
- inventario → qué llevo, mis objetos, mi mochila
  JSON: {"action":"inventario"}
- ayuda → socorro, pista, no sé qué hacer
  JSON: {"action":"ayuda"}
- afirmar → sí, claro, de acuerdo, ok
  JSON: {"action":"afirmar"}
- negar → no, nunca, ni hablar
  JSON: {"action":"negar"}

REGLA CRÍTICA DE MAPEO: Mapea SIEMPRE el verbo del jugador a la acción más cercana.
Usa "fallback" SOLO si es imposible determinar ninguna intención.
Acciones válidas en este lugar: ${validActions.join(', ')}

RESPONDE SIEMPRE con este JSON exacto, sin texto extra, sin markdown:
{
  "intents": [/* array de intents */],
  "narrative": "/* respuesta narrativa, máximo 3 párrafos */"
}

REGLAS CRÍTICAS DE NARRATIVA:
- REGLA MÁS IMPORTANTE: Si existe un "Mensaje canónico del motor", ese texto contiene información esencial del juego (pistas, consecuencias, objetos descubiertos, próximos pasos). DEBES incluirlo COMPLETO e ÍNTEGRO en la narrative. Puedes enriquecerlo con estilo cervantino, pero NUNCA lo omitas ni lo resumas.
- Si engineResult incluye imageUrl, pon <img src="URL"> al inicio de narrative.
- Si hay múltiples acciones, narralas todas en orden respetando cada mensaje canónico.
- Nunca rompas la inmersión ni menciones que eres una IA.
- Si hay helpHint, inclúyelo al final de forma natural.${helpHint ? '\n- Pista a incluir: ' + helpHint : ''}`;

  const userPrompt = engineResult
    ? `El jugador ha escrito: "${userText}"

Resultado del motor del juego:
${JSON.stringify(engineResult, null, 2)}
${engineMessage ? `\nMensaje canónico del motor (OBLIGATORIO incluirlo completo en narrative):\n"${engineMessage}"` : ''}

Genera el JSON con intents y narrative:`
    : `El jugador ha escrito: "${userText}"

Extrae los intents y genera una narrative de espera breve:`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 700,
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const raw = response.choices[0].message.content.trim();

  try {
    const parsed = JSON.parse(raw);
    const intents = (Array.isArray(parsed.intents) ? parsed.intents : [parsed.intents || { action: 'fallback' }])
      .map(intent => ({
        ...intent,
        action: validActions.includes(intent && intent.action) ? intent.action : 'fallback'
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

/**
 * Extrae el mensaje o mensajes canónicos del resultado del motor
 * para pasarlos explícitamente al LLM como texto obligatorio.
 */
function extractEngineMessage(engineResult) {
  if (!engineResult) return null;

  // Resultado múltiple (varias acciones)
  if (engineResult.multiple && engineResult.results) {
    const messages = engineResult.results
      .map(r => r.message)
      .filter(Boolean);
    return messages.length ? messages.join(' | ') : null;
  }

  // Resultado simple
  return engineResult.message || null;
}

module.exports = { processMessage };
