const Groq = require('groq-sdk');
const { getValidActionsForPlace, resolveCanonicalVerb } = require('./actionContext');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_ACTIONS = ['viajar', 'coger', 'tirar', 'comer', 'inventario', 'ayuda', 'afirmar', 'negar'];

async function parseIntents(userText, place) {
  const placeActions = place && place.actions
    ? [...new Set(place.actions.map(a => a.action))]
    : [];

  const availableActions = [...new Set([...placeActions, ...SYSTEM_ACTIONS])];

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Eres un analizador de intenciones para una aventura de texto en español.
Dada una lista de acciones disponibles y el texto del jugador, identifica que acciones quiere realizar.
Las acciones disponibles son verbos en español. El jugador puede usar el verbo exacto o cualquier sinonimo.

REGLAS:
- Responde SOLO con un array JSON, sin texto extra ni markdown.
- Usa SIEMPRE el verbo canonico exacto de la lista de acciones disponibles.
- Si el jugador usa un sinonimo de un verbo, mapea al verbo canonico.
- Extrae el objeto o lugar mencionado cuando aplique (campo "object" o "place").
- Si hay varias acciones en la frase, devuelvelas todas en orden.
- Si no reconoces ninguna accion de la lista, devuelve [{"action":"fallback"}].

Ejemplos:
texto: "ojeo el libro", acciones: ["leer","viajar"] -> [{"action":"leer","object":"libro"}]
texto: "voy a la cocina y cojo la llave", acciones: ["viajar","coger"] -> [{"action":"viajar","place":"cocina"},{"action":"coger","object":"llave"}]
texto: "abro la alacena", acciones: ["abrir","viajar"] -> [{"action":"abrir","object":"alacena"}]`
      },
      {
        role: 'user',
        content: JSON.stringify({ texto: userText, availableActions })
      }
    ],
    max_tokens: 200,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  const raw = response.choices[0].message.content.trim();
  const validActions = getValidActionsForPlace(place);

  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : (parsed.intents || parsed.actions || [parsed]);
    return arr.map(intent => ({
      ...intent,
      action: resolveCanonicalVerb(intent && intent.action, validActions)
    }));
  } catch (e) {
    console.error('Error parseando intents:', raw, e);
    return [{ action: 'fallback' }];
  }
}

async function generateNarrative({ userText, engineResult, user, helpHint }) {
  const placeName = Object.keys(user.room)[0];
  const engineMessage = extractEngineMessage(engineResult);

  const systemPrompt = `Eres el narrador de "Quijote 2077", aventura conversacional en la epoca de El Quijote con toques retrofuturistas.
Estilo: humoristico, ironico, cervantino. Maximo 3 parrafos. Nunca menciones que eres una IA.
Jugador: ${user.userName || 'hidalgo'} | Lugar: ${placeName} | Energia: ${user.hungry}/100
Si hay imageUrl en el resultado, pon <img src="URL"> al inicio.
${helpHint ? `Incluye esta pista al final de forma natural: ${helpHint}` : ''}`.trim();

  const userPrompt = `El jugador escribio: "${userText}"
Resultado: ${JSON.stringify(engineResult)}${engineMessage ? `\nMensaje obligatorio a incluir integro: "${engineMessage}"` : ''}
Genera la respuesta narrativa:`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 400,
    temperature: 0.75
  });

  return response.choices[0].message.content.trim();
}

function extractEngineMessage(engineResult) {
  if (!engineResult) return null;
  if (engineResult.multiple && engineResult.results) {
    const msgs = engineResult.results.map(r => r.message).filter(Boolean);
    return msgs.length ? msgs.join(' | ') : null;
  }
  return engineResult.message || null;
}

module.exports = { parseIntents, generateNarrative };
