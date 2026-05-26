const placesData = require('../../data/places.json');

const parseIntents = async (userText, currentPlaceName, userObjects, userStates, llmClientConf) => {
  const placeData = placesData[currentPlaceName];
  const actionsDescription = placeData?.actionsDescription || 'No hay acciones especiales disponibles en este lugar.';
  const actionIds = (placeData?.actions || []).map(a => a.id).filter(Boolean);
  const inventoryText = (userObjects || []).length > 0
    ? (userObjects || []).map(o => o.name).join(', ')
    : 'mochila vacía';
  const statesText = (userStates || []).length > 0
    ? (userStates || []).join(', ')
    : 'ninguno';

  console.log('llm client: ', llmClientConf.client.baseURL);

  const systemPrompt = `Eres un analizador de intenciones para una aventura de texto en español.

ACCIONES DE LUGAR disponibles aquí:
${actionsDescription}
${actionIds.length > 0 ? `IDs exactos de las acciones de lugar: ${actionIds.join(', ')}` : ''}

ACCIONES DE SISTEMA (siempre disponibles):
- viajar: ir a otro lugar. Devuelve {"action":"viajar","place":"nombre"} o {"action":"viajar","place":"nombre","origin":"origen"} si el lugar tiene nombre compuesto como "habitacion de la posada"
- coger: recoger un objeto del lugar. Devuelve {"action":"coger","object":"nombre"}
- tirar: soltar un objeto del inventario. Devuelve {"action":"tirar","object":"nombre"}
- comer: comer un objeto. Devuelve {"action":"comer","object":"nombre"}
- inventario: ver los objetos que lleva el jugador
- ayuda: pedir ayuda o una pista
- afirmar: responder que sí (sí, claro, vale, de acuerdo...)
- negar: responder que no (no, nunca, para nada...)

El jugador lleva en su mochila: ${inventoryText}
Acciones que el jugador ya ha realizado: ${statesText}

REGLAS:
- Responde SOLO con un array JSON válido, sin texto extra ni markdown.
- Si el jugador quiere hacer una acción de lugar, devuelve exactamente su ID: [{"action":"id_exacto"}]
- Si hay varias intenciones en la frase, devuélvelas todas en orden.
- Nunca repitas la misma acción dos veces; si detectas duplicados elimina el menos fiable.
- Para lugares compuestos como "habitacion de la posada": place="habitacion", origin="posada".
- Para objetos compuestos como "escudo de armas": quédate con el nombre principal "escudo".
- Ignora lo que haya tras preposiciones como "con" cuando indican el instrumento usado.
- Si no reconoces ninguna acción válida, devuelve [{"action":"fallback"}].

Ejemplos:
"utilizo el alambre en la cerradura" -> [{"action":"arreglar_cerradura"}]
"voy a la posada" -> [{"action":"viajar","place":"posada"}]
"me dirijo a la habitacion de la posada" -> [{"action":"viajar","place":"habitacion","origin":"posada"}]
"cojo la manzana y me voy al arco del pueblo" -> [{"action":"coger","object":"manzana"},{"action":"viajar","place":"arco","origin":"pueblo"}]
"qué llevo encima" -> [{"action":"inventario"}]
"trepo el muro" -> [{"action":"escalar_muro"}]`;

  const response = await llmClientConf.client.chat.completions.create({
    model: llmClientConf.model,
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
    const actionsArr = Array.isArray(parsed) ? parsed : (parsed.intents || parsed.actions || parsed.acciones || parsed.items || [parsed]);
    console.log('actions arr: ', actionsArr);
    return actionsArr;
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
