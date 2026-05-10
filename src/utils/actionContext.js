/**
 * MODELO DE SINÓNIMOS INVERTIDO
 * ==============================
 * places.json tiene UN solo verbo canónico por acción.
 * Esta tabla mapea N sinónimos → 1 verbo canónico.
 */
const stringUtils = require('../utils/stringUtils');
const placesData = require('../../data/places.json');

const SYNONYMS_BY_CANONICAL = {
  // --- Verbos de exploración/observación ---
  examinar:  ['mirar', 'observar', 'inspeccionar', 'estudiar', 'contemplar', 'ver', 'ojear', 'revisar', 'comprobar', 'fijarse', 'echar un vistazo', 'estudiar'],
  leer:      ['leer', 'ojear', 'hojear', 'descifrar', 'deletrear'],
  // --- Verbos de manipulación de objetos ---
  abrir:     ['abrir', 'destapar', 'descerrajar', 'forzar', 'desbloquear', 'destrancar'],
  golpear:   ['golpear', 'pegar', 'dar un golpe', 'aporrear', 'sacudir', 'zurrar','atizar', 'romper', 'partir'],
  poner:     ['colocar', 'poner', 'depositar', 'situar', 'apoyar', 'dejar'],
  escalar:   ['escalar', 'trepar', 'subir', 'subirse', 'ascender', 'encaramarse', 'auparse'],
  beber:     ['beber', 'tomar', 'sorber', 'apurar', 'ingerir', 'probar'],
  arreglar:  ['arreglar', 'reparar', 'componer', 'recomponer', 'forzar'],
  cruzar:    ['cruzar', 'atravesar', 'pasar', 'traspasar', 'ir a través', 'cruzar el portal', 'atravesar el portal', 'entrar por el portal', 'pasar por el portal', 'cruzar el umbral', 'atravesar el umbral'],
  saltar:    ['saltar', 'brincar', 'cruzar de un salto', 'lanzarse'],
  velar:     ['velar', 'vigilar', 'guardar', 'hacer guardia'],
  descansar: ['descansar', 'dormir', 'reposar', 'tumbarse', 'echarse', 'sestear', 'descansor', 'echar una siesta'],
  // --- Acciones de sistema (siempre disponibles) ---
  viajar:    ['ir a', 'caminar a', 'dirigirse a', 'moverse a', 'marchar a', 'ir hacia', 'desplazarse a', 'entrar en', 'salir hacia', 'bajar a', 'subir a', 'acceder a', 'cruzar'],
  coger:     ['coger', 'agarrar', 'tomar', 'recoger', 'llevarse', 'alzar', 'levantar', 'hacerse con'],
  tirar:     ['tirar', 'soltar', 'dejar', 'abandonar', 'deshacerse de', 'arrojar'],
  comer:     ['comer', 'zampar', 'devorar', 'ingerir', 'masticar', 'comerse'],
  inventario:['inventario', 'ver inventario', 'qué llevo', 'qué tengo', 'mis objetos', 'mi mochila'],
  ayuda:     ['ayuda', 'socorro', 'no sé qué hacer', 'estoy perdido', 'pista', 'qué hago'],
  afirmar:   ['sí', 'claro', 'por supuesto', 'de acuerdo', 'ok', 'vale'],
  negar:     ['no', 'nunca', 'para nada', 'ni hablar', 'no quiero'],
};

function getValidActionsForPlace(place) {

  const currentPlaceData = placesData[place]

  const placeVerbs = currentPlaceData?.actions
    ? [...new Set(currentPlaceData.actions.map(a => a.action))]
    : [];
  const systemVerbs = ['viajar', 'coger', 'tirar', 'comer', 'inventario', 'ayuda', 'afirmar', 'negar', 'fallback'];
  return [...new Set([...placeVerbs, ...systemVerbs])];
}

const convertActionOnCanonical = (action, validActions) => {
  let actionConverted = action;
  if(Object.keys(SYNONYMS_BY_CANONICAL).find(actKey => actKey == action) && validActions.includes(action)) return actionConverted;
  Object.entries(SYNONYMS_BY_CANONICAL).forEach(([key, sinonims]) => {
    if(sinonims.includes(stringUtils.normalize(action))) actionConverted = key;
  })
  return actionConverted;
}

function resolveCanonicalVerb(actions, validActionsForPlace) {
  return actions.map(act => Object.assign(act, {action: convertActionOnCanonical(act.action, validActionsForPlace)}));
}

module.exports = { getValidActionsForPlace, resolveCanonicalVerb };
