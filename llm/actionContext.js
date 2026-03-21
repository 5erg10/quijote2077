/**
 * MODELO DE SINÓNIMOS INVERTIDO
 * ==============================
 * places.json tiene UN solo verbo canónico por acción.
 * Esta tabla mapea N sinónimos → 1 verbo canónico.
 *
 * El LLM recibe para cada acción del lugar:
 *   - El verbo canónico (el que está en places.json)
 *   - Todos sus sinónimos
 * Y devuelve SIEMPRE el verbo canónico, nunca el sinónimo.
 *
 * Añadir un lugar nuevo con un verbo nuevo solo requiere
 * añadir una entrada aquí. No hay que tocar nada más.
 */

// Mapa: verbo canónico → array de sinónimos que el jugador puede usar
const SYNONYMS_BY_CANONICAL = {
  // --- Verbos de exploración/observación ---
  examinar:  ['mirar', 'observar', 'inspeccionar', 'estudiar', 'contemplar',
               'ver', 'ojear', 'revisar', 'comprobar', 'fijarse', 'echar un vistazo'],
  leer:      ['leer', 'ojear', 'hojear', 'descifrar', 'deletrear',
               'revisar', 'examinar', 'mirar', 'ver'],   // leer absorbe revisar/examinar cuando el objeto es legible

  // --- Verbos de manipulación de objetos ---
  abrir:     ['abrir', 'destapar', 'descerrajar', 'forzar', 'desbloquear', 'destrancar'],
  golpear:   ['golpear', 'pegar', 'dar un golpe', 'aporrear', 'sacudir', 'zurrar',
               'atizar', 'romper', 'partir', 'aporrear'],
  colocar:   ['colocar', 'poner', 'depositar', 'situar', 'apoyar', 'dejar'],
  subir:     ['subirse', 'encaramarse', 'montar', 'trepar', 'auparse'],
  escalar:   ['escalar', 'trepar', 'subir', 'ascender', 'encaramarse'],
  llamar:    ['llamar', 'llamar a la puerta', 'tocar', 'picar', 'golpear la puerta', 'aldabonar'],
  beber:     ['beber', 'tomar', 'sorber', 'apurar', 'ingerir', 'probar'],
  poner:     ['ponerse', 'vestirse', 'equiparse', 'colocarse', 'lucir'],
  arreglar:  ['arreglar', 'reparar', 'componer', 'recomponer', 'usar en', 'forzar'],
  saltar:    ['saltar', 'brincar', 'cruzar de un salto', 'lanzarse'],
  cruzar:    ['cruzar', 'atravesar', 'pasar', 'traspasar', 'ir a través'],
  velar:     ['velar', 'vigilar', 'guardar', 'hacer guardia'],
  descansar: ['descansar', 'dormir', 'reposar', 'tumbarse', 'echarse', 'sestear'],
  atacar:    ['atacar', 'embestir', 'abalanzarse', 'arremeter', 'luchar', 'pelear', 'cargar contra'],

  // --- Acciones de sistema (siempre disponibles) ---
  viajar:    ['ir a', 'caminar a', 'dirigirse a', 'moverse a', 'marchar a', 'ir hacia', 'desplazarse a'],
  coger:     ['coger', 'agarrar', 'tomar', 'recoger', 'llevarse', 'alzar', 'levantar', 'hacerse con'],
  tirar:     ['tirar', 'soltar', 'dejar', 'abandonar', 'deshacerse de', 'arrojar'],
  comer:     ['comer', 'zampar', 'devorar', 'ingerir', 'masticar', 'comerse'],
  inventario:['inventario', 'ver inventario', 'qué llevo', 'qué tengo', 'mis objetos', 'mi mochila'],
  ayuda:     ['ayuda', 'socorro', 'no sé qué hacer', 'estoy perdido', 'pista', 'qué hago'],
  afirmar:   ['sí', 'claro', 'por supuesto', 'de acuerdo', 'ok', 'vale'],
  negar:     ['no', 'nunca', 'para nada', 'ni hablar', 'no quiero'],
};

/**
 * Dado un verbo canónico, devuelve sus sinónimos.
 */
function getSynonyms(canonicalVerb) {
  return SYNONYMS_BY_CANONICAL[canonicalVerb] || [];
}

/**
 * Construye el bloque de acciones para el system prompt del LLM.
 * Para cada acción del lugar muestra el verbo canónico, el objeto
 * y todos los sinónimos que el jugador puede usar.
 * El LLM SIEMPRE debe devolver el verbo canónico en el JSON.
 */
function buildActionContextPrompt(place, placeName) {
  if (!place || !place.actions || place.actions.length === 0) {
    return `En "${placeName}" no hay acciones específicas disponibles más allá de viajar a otro lugar.`;
  }

  // Agrupar por verbo canónico para evitar repetir el mismo verbo
  const verbsInPlace = [...new Set(place.actions.map(a => a.action))];

  const actionLines = verbsInPlace.map(verb => {
    const actionsForVerb = place.actions.filter(a => a.action === verb);
    const objects = actionsForVerb
      .map(a => a.object && a.object.name)
      .filter(Boolean)
      .join(', ');
    const synonyms = getSynonyms(verb);
    const synonymLine = synonyms.length
      ? ` | el jugador puede decir: ${synonyms.slice(0, 6).join(', ')}...`
      : '';
    const objectPart = objects ? `, "object": "${actionsForVerb[0].object && actionsForVerb[0].object.name}"` : '';
    return `  • VERBO CANÓNICO: "${verb}"${objects ? ` → objeto(s): ${objects}` : ''}${synonymLine}\n    JSON a devolver: {"action":"${verb}"${objectPart}}`;
  });

  return `ACCIONES DISPONIBLES EN "${placeName.toUpperCase()}" (usa SIEMPRE el verbo canónico en el JSON, aunque el jugador use un sinónimo):\n${actionLines.join('\n')}`;
}

/**
 * Devuelve el array de verbos canónicos válidos para el lugar actual.
 * Usado para validar la respuesta del LLM.
 */
function getValidActionsForPlace(place) {
  const placeVerbs = place && place.actions
    ? [...new Set(place.actions.map(a => a.action))]
    : [];
  const systemVerbs = ['viajar', 'coger', 'tirar', 'comer', 'inventario', 'ayuda', 'afirmar', 'negar', 'fallback'];
  return [...new Set([...placeVerbs, ...systemVerbs])];
}

/**
 * Dado un verbo que viene del LLM (puede ser sinónimo),
 * intenta encontrar su verbo canónico buscando en la tabla.
 * Usado como fallback en el motor si el LLM devuelve un sinónimo.
 */
function resolveCanonicalVerb(verb, validActionsForPlace) {
  // Si ya es canónico y válido, devolver tal cual
  if (validActionsForPlace.includes(verb)) return verb;

  // Buscar en la tabla cuál canónico tiene este verbo como sinónimo
  for (const [canonical, synonyms] of Object.entries(SYNONYMS_BY_CANONICAL)) {
    if (synonyms.includes(verb) && validActionsForPlace.includes(canonical)) {
      return canonical;
    }
  }
  return 'fallback';
}

module.exports = { buildActionContextPrompt, getValidActionsForPlace, getSynonyms, resolveCanonicalVerb };
