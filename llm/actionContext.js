/**
 * MODELO DE SINÓNIMOS INVERTIDO
 * ==============================
 * places.json tiene UN solo verbo canónico por acción.
 * Esta tabla mapea N sinónimos → 1 verbo canónico.
 */

const SYNONYMS_BY_CANONICAL = {
  // --- Verbos de exploración/observación ---
  examinar:  ['mirar', 'observar', 'inspeccionar', 'estudiar', 'contemplar', 'ver', 'ojear', 'revisar', 'comprobar', 'fijarse', 'echar un vistazo'],
  leer:      ['leer', 'ojear', 'hojear', 'descifrar', 'deletrear', 'revisar', 'examinar', 'mirar', 'ver'],
  // --- Verbos de manipulación de objetos ---
  abrir:     ['abrir', 'destapar', 'descerrajar', 'forzar', 'desbloquear', 'destrancar'],
  golpear:   ['golpear', 'pegar', 'dar un golpe', 'aporrear', 'sacudir', 'zurrar','atizar', 'romper', 'partir'],
  colocar:   ['colocar', 'poner', 'depositar', 'situar', 'apoyar', 'dejar'],
  subir:     ['subirse', 'encaramarse', 'montar', 'trepar', 'auparse'],
  escalar:   ['escalar', 'trepar', 'subir', 'ascender', 'encaramarse'],
  llamar:    ['llamar', 'llamar a la puerta', 'tocar', 'picar', 'golpear la puerta', 'aldabonar'],
  beber:     ['beber', 'tomar', 'sorber', 'apurar', 'ingerir', 'probar'],
  poner:     ['ponerse', 'vestirse', 'equiparse', 'colocarse', 'lucir'],
  arreglar:  ['arreglar', 'reparar', 'componer', 'recomponer', 'usar en', 'forzar'],
  cruzar:    ['cruzar', 'atravesar', 'pasar', 'traspasar', 'ir a través', 'cruzar el portal', 'atravesar el portal', 'entrar por el portal', 'pasar por el portal', 'cruzar el umbral', 'atravesar el umbral'],
  saltar:    ['saltar', 'brincar', 'cruzar de un salto', 'lanzarse'],
  velar:     ['velar', 'vigilar', 'guardar', 'hacer guardia'],
  descansar: ['descansar', 'dormir', 'reposar', 'tumbarse', 'echarse', 'sestear'],
  atacar:    ['atacar', 'embestir', 'abalanzarse', 'arremeter', 'luchar', 'pelear', 'cargar contra'],
  // --- Acciones de sistema (siempre disponibles) ---
  viajar:    ['ir a', 'caminar a', 'dirigirse a', 'moverse a', 'marchar a', 'ir hacia', 'desplazarse a', 'entrar en', 'salir hacia', 'bajar a', 'subir a', 'acceder a'],
  coger:     ['coger', 'agarrar', 'tomar', 'recoger', 'llevarse', 'alzar', 'levantar', 'hacerse con'],
  tirar:     ['tirar', 'soltar', 'dejar', 'abandonar', 'deshacerse de', 'arrojar'],
  comer:     ['comer', 'zampar', 'devorar', 'ingerir', 'masticar', 'comerse'],
  inventario:['inventario', 'ver inventario', 'qué llevo', 'qué tengo', 'mis objetos', 'mi mochila'],
  ayuda:     ['ayuda', 'socorro', 'no sé qué hacer', 'estoy perdido', 'pista', 'qué hago'],
  afirmar:   ['sí', 'claro', 'por supuesto', 'de acuerdo', 'ok', 'vale'],
  negar:     ['no', 'nunca', 'para nada', 'ni hablar', 'no quiero'],
};

function getValidActionsForPlace(place) {
  const placeVerbs = place && place.actions
    ? [...new Set(place.actions.map(a => a.action))]
    : [];
  const systemVerbs = ['viajar', 'coger', 'tirar', 'comer', 'inventario', 'ayuda', 'afirmar', 'negar', 'fallback'];
  return [...new Set([...placeVerbs, ...systemVerbs])];
}

const convertActionOnCanonical = (action, validActions) => {
  let actionConverted = action;
  if(Object.keys(SYNONYMS_BY_CANONICAL).find(actKey => actKey == action) && validActions.includes(action)) return actionConverted;
  Object.entries(SYNONYMS_BY_CANONICAL).forEach(([key, sinonims]) => {
    if(sinonims.includes(action.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase())) actionConverted = key;
  })
  return actionConverted;
}

function resolveCanonicalVerb(actions, validActionsForPlace) {
  return actions.map(act => Object.assign(act, {action: convertActionOnCanonical(act.action, validActionsForPlace)}));
}

module.exports = { getValidActionsForPlace, resolveCanonicalVerb };
