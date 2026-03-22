const { getValidActionsForPlace, resolveCanonicalVerb } = require('./actionContext');

const parseIntents = async (userText, place, llmClientConf) => {
 
  const availableActions = getValidActionsForPlace(place);

  const response = await llmClientConf.client.chat.completions.create({
    model: llmClientConf.model,
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

  try {
    const parsed = JSON.parse(raw);
    const actionsArr = Array.isArray(parsed) ? parsed : (parsed.intents || parsed.actions || parsed.acciones || parsed.items || [parsed]);
    console.log('actions arr: ', actionsArr)
    return resolveCanonicalVerb(actionsArr, availableActions);
  } catch (e) {
    console.error('Error parseando intents:', raw, e);
    return [{ action: 'fallback' }];
  }
}

const generateNarrative = async ({ llmClientConf, userText, engineResult, user, helpHint }) => {
  const placeName = Object.keys(user.room)[0];
  const engineMessage = extractEngineMessage(engineResult);
  const imagUrl = engineResult.imageUrl;

  const systemPrompt = `Eres el narrador de "Quijote 2077", aventura conversacional en la epoca de El Quijote.
Estilo: humoristico, ironico, cervantino. nunca mas de 1 parrafo o 100 palabras. Nunca menciones que eres una IA.
Jugador: ${user.userName || 'hidalgo'} | Lugar: ${placeName}
PROHIBIDO: no menciones energia, vida, puntos de vida, distancia, pasos ni datos numericos internos del juego.
${helpHint ? `Incluye esta pista al final de forma natural: ${helpHint}` : ''}`.trim();

  const userPrompt = `El jugador escribio: "${userText}"
Resultado: ${JSON.stringify(sanitizeEngineResult(engineResult))}${engineMessage ? `\nMensaje obligatorio a incluir integro: "${engineMessage}"` : ''}
Genera la respuesta narrativa:`;

  const response = await llmClientConf.client.chat.completions.create({
    model: llmClientConf.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 400,
    temperature: 0.75
  });

  return `${imagUrl ? `<img src="${imagUrl}"/>` : ''}` + response.choices[0].message.content.trim();
}

const sanitizeEngineResult = (engineResult) => {
  if (!engineResult) return engineResult;

  const INTERNAL_FIELDS = ['distance', 'newHungry', 'longTrip', 'lifePoints', 'currentWeight'];

  if (engineResult.multiple && engineResult.results) {
    return {
      ...engineResult,
      results: engineResult.results.map(r => removeFields(r, INTERNAL_FIELDS))
    };
  }

  return removeFields(engineResult, INTERNAL_FIELDS);
}

const removeFields = (obj, fields) => {
  const clean = { ...obj };
  fields.forEach(f => delete clean[f]);
  return clean;
}

const extractEngineMessage = (engineResult) => {
  if (!engineResult) return null;
  if (engineResult.multiple && engineResult.results) {
    const msgs = engineResult.results.map(r => r.message).filter(Boolean);
    return msgs.length ? msgs.join(' | ') : null;
  }
  return engineResult.message || null;
}

module.exports = { parseIntents, generateNarrative };
