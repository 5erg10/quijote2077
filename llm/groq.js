const Groq = require('groq-sdk');
const { getValidActionsForPlace, resolveCanonicalVerb, getSynonyms } = require('./actionContext');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function parseIntents(userText, place) {
  const validActions = getValidActionsForPlace(place);

  const actionList = validActions
    .filter(a => a !== 'fallback')
    .map(verb => {
      const synonyms = getSynonyms(verb);
      const synonymPart = synonyms.length ? ` (sinonimos: ${synonyms.slice(0, 5).join(', ')})` : '';
      return `- ${verb}${synonymPart}`;
    })
    .join('\n');

  const systemPrompt = `Eres un analizador de intenciones para una aventura de texto.
Tu UNICA tarea: leer el texto del jugador e identificar que acciones quiere realizar.

Acciones disponibles:\n${actionList}

REGLAS:
- Devuelve SOLO un array JSON, sin texto extra ni markdown.
- Usa SIEMPRE el verbo canonico exacto (el que aparece antes del parentesis).
- Si el jugador usa un sinonimo, mapea al verbo canonico.
- Extrae el objeto o lugar mencionado cuando aplique.
- Si hay varias acciones en una frase, devuelvelas todas en orden.
- Si no reconoces ninguna accion, devuelve [{"action":"fallback"}].

Ejemplos:
"leo el libro" -> [{"action":"leer","object":"libro"}]
"voy a la cocina y cojo la llave" -> [{"action":"viajar","place":"cocina"},{"action":"coger","object":"llave"}]
"ojeo el libro" -> [{"action":"leer","object":"libro"}]`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText }
    ],
    max_tokens: 200,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  const raw = response.choices[0].message.content.trim();

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
Resultado: ${JSON.stringify(engineResult)}${engineMessage ? `
Mensaje obligatorio a incluir integro: "${engineMessage}"` : ''}
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
