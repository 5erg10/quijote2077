const Groq = require('groq-sdk');
const placesDao = require('../functions/dao/places');
const { buildActionContextPrompt, getValidActionsForPlace, resolveCanonicalVerb } = require('./actionContext');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
  const engineMessage = extractEngineMessage(engineResult);

  const systemPrompt = `Eres el narrador de "Quijote 2077", una aventura conversacional ambientada en la \u00e9poca de El Quijote con toques retrofuturistas.
Tienes DOS responsabilidades en cada turno:
1. ANALIZAR la intenci\u00f3n del jugador y extraerla como JSON.
2. NARRAR la respuesta con estilo humor\u00edstico, ir\u00f3nico y cervantino.

Estado actual:
- Jugador: ${user.userName || 'hidalgo'}
- Lugar: ${placeName}
- Descripci\u00f3n: ${placeDescription}
- Objetos visibles: ${objectsInPlace}
- Inventario: ${objectsInInventory}
- Energ\u00eda: ${user.hungry}/100
- Dificultad: ${(user.difficulty && user.difficulty.level) || 'normal'}
- Lugares conocidos: ${placeNames.join(', ')}
- Objetos del mundo: ${objectNames.join(', ')}

${actionContextBlock}

ACCIONES DE SISTEMA (siempre disponibles):
- viajar \u2192 ir a, caminar hacia, dirigirse a | JSON: {"action":"viajar","place":"nombre"}
- coger \u2192 agarrar, tomar, recoger, alzar | JSON: {"action":"coger","object":"nombre"}
- tirar \u2192 soltar, dejar, abandonar | JSON: {"action":"tirar","object":"nombre"}
- comer \u2192 ingerir, zampar, devorar | JSON: {"action":"comer","object":"nombre"}
- inventario \u2192 qu\u00e9 llevo, mis objetos | JSON: {"action":"inventario"}
- ayuda \u2192 socorro, pista, estoy perdido | JSON: {"action":"ayuda"}
- afirmar \u2192 s\u00ed, claro, ok | JSON: {"action":"afirmar"}
- negar \u2192 no, nunca, ni hablar | JSON: {"action":"negar"}

REGLA CR\u00cdTICA: Usa SIEMPRE el VERBO CAN\u00d3NICO en el JSON aunque el jugador use un sin\u00f3nimo.
Ejemplo: si en este lugar el verbo can\u00f3nico es "leer" y el jugador escribe "ojeo el libro" \u2192 devuelve {"action":"leer","object":"libro"}
Usa fallback SOLO si es imposible determinar ninguna intenci\u00f3n.
Verbos can\u00f3nicos v\u00e1lidos ahora: ${validActions.join(', ')}

RESPONDE SIEMPRE con JSON exacto sin texto extra ni markdown:
{
  "intents": [/* array */],
  "narrative": "/* m\u00e1ximo 3 p\u00e1rrafos */"
}

REGLAS DE NARRATIVA:
- REGLA M\u00c1S IMPORTANTE: si hay un mensaje can\u00f3nico del motor, incl\u00fayeloINTEGRO. Pu\u00e9des enriquecerlo con estilo pero NUNCA lo omitas.
- Si engineResult tiene imageUrl, pon <img src="URL"> al inicio.
- Nunca menciones que eres una IA.${helpHint ? '\n- Pista a incluir al final: ' + helpHint : ''}`;

  const userPrompt = engineResult
    ? `El jugador ha escrito: "${userText}"\n\nResultado del motor:\n${JSON.stringify(engineResult, null, 2)}${engineMessage ? `\n\nMensaje can\u00f3nico (OBLIGATORIO en narrative):\n"${engineMessage}"` : ''}\n\nGenera JSON con intents y narrative:`
    : `El jugador ha escrito: "${userText}"\n\nExtrae intents y genera narrative de espera breve:`;

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
        // Doble red de seguridad: si el LLM devuelve un sin\u00f3nimo, lo resolvemos aqu\u00ed
        action: resolveCanonicalVerb(intent && intent.action, validActions)
      }));
    return { intents, narrative: parsed.narrative || '' };
  } catch (e) {
    console.error('Error parseando Groq:', raw, e);
    return {
      intents: [{ action: 'fallback' }],
      narrative: 'No os entiendo, valiente hidalgo. \u00bfPod\u00e9is repetirlo con otras palabras?'
    };
  }
}

function extractEngineMessage(engineResult) {
  if (!engineResult) return null;
  if (engineResult.multiple && engineResult.results) {
    const msgs = engineResult.results.map(r => r.message).filter(Boolean);
    return msgs.length ? msgs.join(' | ') : null;
  }
  return engineResult.message || null;
}

module.exports = { processMessage };
