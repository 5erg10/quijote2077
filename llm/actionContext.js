/**
 * MODELO DE SINÓNIMOS INVERTIDO
 * ==============================
 * places.json tiene UN solo verbo canónico por acción.
 * Esta tabla mapea N sinónimos → 1 verbo canónico.
 */

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
  // cruzar NO incluye frases de portal: esas se resuelven por contextAction
  cruzar:    ['cruzar', 'atravesar', 'pasar', 'traspasar', 'ir a través',
               'cruzar el portal', 'atravesar el portal', 'entrar por el portal',
               'pasar por el portal', 'cruzar el umbral', 'atravesar el umbral'],
  saltar:    ['saltar', 'brincar', 'cruzar de un salto', 'lanzarse'],
  velar:     ['velar', 'vigilar', 'guardar', 'hacer guardia'],
  descansar: ['descansar', 'dormir', 'reposar', 'tumbarse', 'echarse', 'sestear'],
  atacar:    ['atacar', 'embestir', 'abalanzarse', 'arremeter', 'luchar', 'pelear', 'cargar contra'],

  // --- Acciones de sistema (siempre disponibles) ---
  // NOTA: viajar NO incluye frases de portal para que no bypass contextAction
  viajar:    ['ir a', 'caminar a', 'dirigirse a', 'moverse a', 'marchar a', 'ir hacia',
               'desplazarse a', 'entrar en', 'salir hacia', 'bajar a', 'subir a', 'acceder a'],
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
 */
const CONTEXTUAL_TRAVEL_HINTS = {
  'biblioteca→habitación': [
    'cruzo el portal', 'cruzar el portal', 'atravieso el portal',
    'entro por el portal', 'paso por el portal'
  ]
};

function getSynonyms(canonicalVerb) {
  return SYNONYMS_BY_CANONICAL[canonicalVerb] || [];
}

function buildActionContextPrompt(place, placeName) {
  const lines = [];

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

  // Destinos de viaje con frases contextuales
  const connectedRooms = (place && place.connectedRooms) || [];
  if (connectedRooms.length > 0) {
    lines.push(`\nDESTINOS DE VIAJE DESDE "${placeName.toUpperCase()}":`);
    connectedRooms.forEach(dest => {
      const contextKey = `${placeName}→${dest}`;
      const contextualPhrases = CONTEXTUAL_TRAVEL_HINTS[contextKey] || [];
      // Solo mostrar frases contextuales si NO hay una acción cruzar que las gestione
      // (para evitar que el LLM mapee directo a viajar en lugar de cruzar)
      const hasCruzarAction = place && place.actions &&
        place.actions.some(a => a.action === 'cruzar');
      const phrasesNote = contextualPhrases.length && !hasCruzarAction
        ? ` | frases: "${contextualPhrases.slice(0, 3).join('", "')}"`
        : '';
      lines.push(`  • "${dest}"${phrasesNote} → JSON: {"action":"viajar","place":"${dest}"}`);
    });
    lines.push(`  REGLA: Usa "viajar" para moverte entre lugares. Si hay una acción "cruzar" disponible en este lugar, úsala en su lugar para objetos como portales o cancelas.`);
  }

  return lines.join('\n');
}

function getValidActionsForPlace(place) {
  const placeVerbs = place && place.actions
    ? [...new Set(place.actions.map(a => a.action))]
    : [];
  const systemVerbs = ['viajar', 'coger', 'tirar', 'comer', 'inventario', 'ayuda', 'afirmar', 'negar', 'fallback'];
  return [...new Set([...placeVerbs, ...systemVerbs])];
}

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
