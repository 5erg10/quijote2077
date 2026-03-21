/**
 * Genera dinámicamente el bloque de acciones del prompt LLM
 * a partir de las acciones reales del lugar actual en places.json.
 *
 * Para cada verbo de acción que aparece en el lugar, añade
 * una tabla de sinónimos naturales en español para que el LLM
 * pueda mapear frases libres del jugador al verbo correcto.
 */

// Tabla de sinónimos por verbo. Incluye todos los verbos
// que aparecen en places.json más sus equivalentes naturales.
const VERB_SYNONYMS = {
  // Verbos de exploración
  examinar:  ['mirar', 'observar', 'inspeccionar', 'estudiar', 'contemplar', 'fijarse en', 'echar un vistazo a', 'ver', 'ojear'],
  revisar:   ['revisar', 'comprobar', 'verificar', 'chequear', 'echar un ojo a'],
  leer:      ['leer', 'ojear', 'hojear', 'deletrear', 'descifrar'],

  // Verbos de interacción con objetos
  abrir:     ['abrir', 'destapar', 'descerrajar', 'forzar', 'desbloquear'],
  cerrar:    ['cerrar', 'tapar', 'bloquear'],
  golpear:   ['golpear', 'pegar', 'dar un golpe a', 'aporrear', 'sacudir', 'zurrar', 'atizar'],
  colocar:   ['colocar', 'poner', 'depositar', 'situar', 'dejar', 'apoyar'],
  subir:     ['subir', 'escalar', 'trepar', 'encaramarse a', 'montar en'],
  escalar:   ['escalar', 'trepar', 'subir', 'ascender'],
  llamar:    ['llamar', 'llamar a la puerta', 'tocar', 'golpear la puerta', 'picar'],
  beber:     ['beber', 'tomar', 'sorber', 'apurar', 'ingerir'],
  poner:     ['ponerse', 'vestirse con', 'equiparse con', 'colocarse'],
  arreglar:  ['arreglar', 'reparar', 'componer', 'recomponer', 'usar en'],
  coger:     ['coger', 'agarrar', 'tomar', 'recoger', 'llevarse', 'hacerse con', 'alzar', 'levantar'],
  tirar:     ['tirar', 'lanzar', 'arrojar', 'echar'],
  atacar:    ['atacar', 'embestir', 'abalanzarse sobre', 'arremeter contra', 'luchar contra'],
  saltar:    ['saltar', 'brincar', 'cruzar de un salto', 'atravesar de un salto'],
  cruzar:    ['cruzar', 'atravesar', 'pasar', 'traspasar'],
  velar:     ['velar', 'vigilar', 'guardar'],
  descansar: ['descansar', 'dormir', 'reposar', 'tumbarse', 'echarse'],
  comer:     ['comer', 'zampar', 'devorar', 'probar', 'ingerir', 'masticar'],
  usar:      ['usar', 'utilizar', 'emplear', 'servirse de', 'aplicar'],

  // Acciones de navegación y sistema
  viajar:    ['ir a', 'caminar a', 'dirigirse a', 'moverse a', 'desplazarse a', 'marchar a', 'ir hacia', 'viajar a'],
  inventario:['ver inventario', 'qué llevo', 'qué tengo', 'mis objetos', 'mi mochila', 'mis cosas', 'inventario'],
  ayuda:     ['ayuda', 'socorro', 'no sé qué hacer', 'estoy perdido', 'pista', 'qué hago'],
  afirmar:   ['sí', 'claro', 'por supuesto', 'de acuerdo', 'ok', 'vale', 'quiero'],
  negar:     ['no', 'nunca', 'para nada', 'ni hablar', 'no quiero'],
};

/**
 * Extrae las acciones disponibles en un lugar y construye
 * el bloque de texto para el system prompt del LLM.
 *
 * @param {object} place - Objeto del lugar desde places.json
 * @param {string} placeName - Nombre del lugar actual
 * @returns {string} Bloque de texto para insertar en el prompt
 */
function buildActionContextPrompt(place, placeName) {
  if (!place || !place.actions || place.actions.length === 0) {
    return `En ${placeName} no hay acciones específicas disponibles más allá de viajar a otro lugar.`;
  }

  // Extraer verbos únicos de las acciones del lugar
  const verbsInPlace = [...new Set(place.actions.map(a => a.action))];

  // Construir la lista de acciones con sus objetos y sinónimos
  const actionLines = verbsInPlace.map(verb => {
    const actionsForVerb = place.actions.filter(a => a.action === verb);
    const objects = actionsForVerb
      .map(a => a.object && a.object.name)
      .filter(Boolean)
      .join(', ');
    const synonyms = VERB_SYNONYMS[verb] || [];
    const synonymLine = synonyms.length
      ? ` (sinónimos: ${synonyms.join(', ')})`
      : '';
    const objectLine = objects ? ` sobre: ${objects}` : '';
    return `  - "${verb}"${objectLine}${synonymLine} → JSON: {"action":"${verb}"${objects ? `,"object":"${actionsForVerb[0].object.name}"` : ''}}`;
  });

  return `Acciones específicas disponibles en ${placeName}:\n${actionLines.join('\n')}`;
}

/**
 * Devuelve el array de todos los verbos de acción válidos
 * para el lugar actual (para validar en el parser).
 */
function getValidActionsForPlace(place) {
  const placeVerbs = place && place.actions
    ? place.actions.map(a => a.action)
    : [];

  const systemVerbs = ['viajar', 'coger', 'tirar', 'comer', 'inventario', 'ayuda', 'afirmar', 'negar', 'fallback'];

  return [...new Set([...placeVerbs, ...systemVerbs])];
}

module.exports = { buildActionContextPrompt, getValidActionsForPlace, VERB_SYNONYMS };
