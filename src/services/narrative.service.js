const { getValidActionsForPlace, resolveCanonicalVerb } = require('../utils/actionContext');

const parseIntents = async (userText, currentPlaceName, llmClientConf) => {

  const availableActions = getValidActionsForPlace(currentPlaceName);

  const models = await llmClientConf.client.models.list();

  console.log('llm client: ', llmClientConf.client.baseURL);
  // console.log('models: ', models);

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
- Cuando el lugar es compuesto, extrae lugar y origen (campo "place" y campo "origin")
- Si hay varias acciones en la frase, devuelvelas todas en orden.
- Todo lo que haya después de una preposición como "con" ignoralo, el jugador se esta refiriendo al objeto con el que realiza la accion, no a otra accion.
- Nunca puede haber una misma accion como por ejemplo "viajar" o "coger", si detectas en el resultado que obtengas una accion repetida, elimina la menos confiable.
- Puede haber nombres de objetos compuestos, por ejemplo "escudo de armas", en ese caso quedate con el nombre del objeto principal, que seria "escudo".
- Puede haber nombres de lugares compuestos, como puede ser "habitacion de la posada, en esos casos el lugar es la primera parte, "habitacion", y el segundo el origen "posada"
- Si no reconoces ninguna accion de la lista, devuelve [{"action":"fallback"}].

Ejemplos:
texto: "ojeo el libro", acciones: ["leer","viajar"] -> [{"action":"leer","object":"libro"}]
texto: "abro la puerta con la llave", acciones: ["abrir","viajar"] -> [{"action":"abrir","object":"puerta"}]
texto: "voy a la cabaña", acciones: ["leer", "viajar"] -> [{"ation": "viajar", "place": "cabaña"}]
texto: "voy a la cocina y cojo la llave", acciones: ["viajar","coger"] -> [{"action":"viajar","place":"cocina"},{"action":"coger","object":"llave"}]
texto: "abro la alacena", acciones: ["abrir","viajar"] -> [{"action":"abrir","object":"alacena"}]
texto: "cojo el currusco de pan", acciones: ["coger", "viajar"] -> [{"action": "coger", "object": "currusco"}]
texto: "Voy a la habitacion de la posada", acciones: ["viajar", "coger", "comer"] -> [{"action": "viajar", "place": "habitacion", "origin": "posada"}]
texto: "analizo el escudo de armas y me voy a la bodega de la venta", acciones: ["viajar", "coger", "comer", "revisar"] -> [{"action": "revisar", "object": "escudo"},{"action": "viajar", "place": "bodega", "origin": "venta"}]`
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
  const engineMessage = extractEngineMessage(engineResult);
  const imagUrl = engineResult.imageUrl;

  const systemPrompt = `Eres el narrador de "Quijote 2077", aventura conversacional en la epoca de El Quijote.
Estilo: humoristico, ironico, cervantino. nunca mas de 1 parrafo o 100 palabras. Nunca menciones que eres una IA.
Nunca omitas ninguna informacion contenida en el texto.
Da prioridad màxima a la informacion contenida en el texto, siempre tiene que quedar clara la informacion de los lugares y objetos que se mencionen.
PROHIBIDO: no hagas referencia a que haya mas personas en el juego, solo esta el jugador.
PROHIBIDO: no menciones energia, vida, puntos de vida, distancia, pasos ni datos numericos internos del juego a no ser que se mencione en el texto.
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
