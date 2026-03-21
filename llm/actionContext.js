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
 */

// Mapa: verbo canónico → array de sinónimos que el jugador puede usar
const SYNONYMS_BY_CANONICAL = {
  // --- Verbos de exploración/observación ---
  examinar:  ['mirar', 'observar', 'inspeccionar', 'estudiar', 'contemplar',
               'ver', 'ojear', 'revisar', 'comprobar', 'fijarse', 'echar un vistazo'],
  leer:      ['leer', 'ojear', 'hojear', 'descifrar', 'deletrear',
               'revisar', 'examinar', 'mirar', 'ver'],

  // --- Verbos de manipulación de objetos ---
  abrir:     ['abrir', 'destapar', 'descerrajar', 'forzar', 'desbloquear', 'destrancar'],
  golpear:   ['golpear', 'pegar', 'dar un golpe', 'aporrear', 'sacudir', 'zurrar',
               'atizar', 'romper', 'partir'],
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
  viajar:    [
    // Movimiento genérico
    'ir a', 'caminar a', 'dirigirse a', 'moverse a', 'marchar a', 'ir hacia', 'desplazarse a',
    // Atravesar portales/umbrales/puertas mágicas (biblioteca → habitación)
    'cruzar el portal', 'atravesar el portal', 'entrar por el portal',
    'pasar por el portal', 'cruzar el umbral', 'atravesar el umbral',
    'entrar en la habitación', 'ir a la habitación', 'cruzar hacia la habitación',
    // Cruzar la cancela final
    'cruzar la cancela', 'atravesar la cancela', 'pasar la cancela',
    // Entrar/salir genérico
    'entrar en', 'salir hacia', 'bajar a', 'subir a', 'acceder a'
  ],
  coger:     ['coger', 'agarrar', 'tomar', 'recoger', 'llevarse', 'alzar', 'levantar', 'hacerse con'],
  tirar:     ['tirar', 'soltar', 'dejar', 'abandonar', 'deshacerse de', 'arrojar'],
  comer:     ['comer', 'zampar', 'devorar', 'ingerir', 'masticar', 'comerse'],
  inventario:['inventario', 'ver inventario', 'qué llevo', 'qué tengo', 'mis objetos', 'mi mochila'],
  ayuda:     ['ayuda', 'socorro', 'no sé qué hacer', 'estoy perdido', 'pista', 'qué hago'],
  afirmar:   ['sí', 'claro', 'por supuesto', 'de acuerdo', 'ok', 'vale'],
  negar:     ['no', 'nunca', 'para nada', 'ni hablar', 'no quiero'],
};

/**
 * Frases contextuales por par (lugarOrigen → lugarDestino).
 * Cuando el LLM ve al jugador en un lugar origen y escribe
 * alguna de estas frases, debe mapearlas a viajar + destino.
 * Esto enriquece el prompt con contexto narrativo específico.
 */
const CONTEXTUAL_TRAVEL_HINTS = {
  'biblioteca→habitación': [
    'cruzo el portal', 'cruzar el portal', 'atravieso el portal',
    'entro por el portal', 'paso por el portal', 'me adentro en el portal',
    'accedo a la habitación', 'voy a la habitación'
  ],
  'cancela→más allá': [
    'cruzar la cancela', 'atravesar la cancela', 'pasar la cancela'
  ]
};

/**
 * Dado un verbo canónico, devuelve sus sinónimos.
 */
function getSynonyms(canonicalVerb) {
  return SYNONYMS_BY_CANONICAL[canonicalVerb] || [];
}

/**
 * Construye el bloque de acciones para el system prompt del LLM.
 * Incluye acciones específicas del lugar Y los destinos de viaje
 * disponibles con sus frases contextuales.
 */
function buildActionContextPrompt(place, placeName) {
  const lines = [];

  // --- Acciones específicas del lugar ---
  if (place && place.actions && place.actions.length > 0) {
    const verbsInPlace = [...new Set(place.actions.map(a => a.action))];
    const actionLines = verbsInPlace.map(verb => {
      const actionsForVerb = place.actions.filter(a => a.action === verb);
      const objects = actionsForVerb
        .map(a => a.object && a.object.name)
        .filter(Boolean)
        .join(', ');
      const synonyms = getSynonyms(verb);
      const synonymLine = synonyms.length
        ? ` | el jugador puede decir: ${synonyms.slice(0, 5).join(', ')}...`
        : '';
      const objectPart = objects
        ? `, "object": "${actionsForVerb[0].object && actionsForVerb[0].object.name}"`
        : '';
      return `  • VERBO CANÓNICO: "${verb}"${objects ? ` → objeto(s): ${objects}` : ''}${synonymLine}\n    JSON: {"action":"${verb}"${objectPart}}`;
    });
    lines.push(`ACCIONES DISPONIBLES EN "${placeName.toUpperCase()}":`);
    lines.push(...actionLines);
  } else {
    lines.push(`En "${placeName}" no hay acciones específicas disponibles más allá de viajar.`);
  }

  // --- Destinos de viaje disponibles con frases contextuales ---
  const connectedRooms = (place && place.connectedRooms) || [];
  if (connectedRooms.length > 0) {
    lines.push(`\nDESTINOS DE VIAJE DESDE "${placeName.toUpperCase()}":`);
    connectedRooms.forEach(dest => {
      const contextKey = `${placeName}→${dest}`;
      const contextualPhrases = CONTEXTUAL_TRAVEL_HINTS[contextKey] || [];
      const phrasesNote = contextualPhrases.length
        ? ` | frases contextuales: "${contextualPhrases.slice(0, 4).join('", "')}"`
        : '';
      lines.push(`  • "${dest}"${phrasesNote} → JSON: {"action":"viajar","place":"${dest}"}`);
    });
    lines.push(`  REGLA: Si el jugador usa cualquier frase que implique moverse a uno de estos destinos, devuelve {"action":"viajar","place":"nombre_destino"}.`);
  }

  return lines.join('\n');
}

/**
 * Devuelve el array de verbos canónicos válidos para el lugar actual.
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
 */
function resolveCanonicalVerb(verb, validActionsForPlace) {
  if (validActionsForPlace.includes(verb)) return verb;
  for (const [canonical, synonyms] of Object.entries(SYNONYMS_BY_CANONICAL)) {
    if (synonyms.includes(verb) && validActionsForPlace.includes(canonical)) {
      return canonical;
    }
  }
  return 'fallback';
}

module.exports = { buildActionContextPrompt, getValidActionsForPlace, getSynonyms, resolveCanonicalVerb };
