const placesDao = require('../../functions/dao/places');
const statesDao = require('../../functions/dao/states');
const arrayUtils = require('../../functions/utils/arrayUtils');
const gameOperations = require('../../functions/business/gameOperations');
const countIntents = require('../../functions/utils/countIntents');
const { resolveCanonicalVerb, getValidActionsForPlace } = require('../../llm/actionContext');

async function execute(intent, userId, user) {
  const objectName = intent.object;
  const placeName = Object.keys(user.room)[0];

  const place = await placesDao.getPlaceById(placeName);
  if (!place) {
    return { action: intent.action, success: false, message: 'No puedo hacer eso aqu\u00ed.' };
  }

  // Resolver verbo can\u00f3nico
  const validActions = getValidActionsForPlace(place);
  const canonicalVerb = resolveCanonicalVerb(intent.action, validActions);

  if (canonicalVerb === 'fallback') {
    await countIntents.count(userId);
    return { action: intent.action, success: false, message: 'Eso no se puede hacer aqu\u00ed.' };
  }

  // Buscar acci\u00f3n: primero por verbo+objeto (match exacto), luego solo por verbo
  // IMPORTANTE: si hay objeto en el intent, es obligatorio que coincida.
  // Solo hacemos fallback a "solo verbo" si el intent no trajo objeto.
  let matchedAction;
  if (objectName) {
    matchedAction = (place.actions || []).find(
      a => a.action === canonicalVerb && a.object && a.object.name === objectName
    );
    // Si hay objeto en el intent pero no coincide con ninguna acci\u00f3n,
    // intentamos buscar solo por verbo como \u00faltimo recurso
    if (!matchedAction) {
      matchedAction = (place.actions || []).find(a => a.action === canonicalVerb);
    }
  } else {
    // Sin objeto: coger la primera acci\u00f3n que coincida con el verbo
    matchedAction = (place.actions || []).find(a => a.action === canonicalVerb);
  }

  if (!matchedAction) {
    await countIntents.count(userId);
    return { action: canonicalVerb, success: false, message: 'Eso no se puede hacer aqu\u00ed.' };
  }

  // --- VERIFICAR REQUISITOS ---
  const userStates = user.states || [];
  const userObjects = (user.objects || []).map(o => o.name);

  const statusOk = arrayUtils.isSubset(matchedAction.requirementStatus || [], userStates);
  const objectsOk = arrayUtils.isSubset(matchedAction.requirementObject || [], userObjects);
  const requirementsOk = statusOk && objectsOk;

  if (!requirementsOk) {
    // Si fallar tiene consecuencias fatales, game over
    if (matchedAction.endReason) {
      const resetResult = gameOperations.buildResetResult(matchedAction.failResponse, matchedAction.endReason);
      // Aplicar el reset en Firebase
      await gameOperations.applyReset(userId, user.userName, matchedAction.endReason);
      return resetResult;
    }
    await countIntents.count(userId);
    return { action: canonicalVerb, success: false, message: matchedAction.failResponse };
  }

  // --- EJECUTAR: guardar estado ---
  const objectKey = matchedAction.object && matchedAction.object.name
    ? `_${matchedAction.object.name}`
    : '';
  const statusKey = `${canonicalVerb}${objectKey}`;

  try {
    await statesDao.addStatus(userId, user, statusKey);
  } catch (e) {
    // El estado ya existe: acci\u00f3n repetida
    return { action: canonicalVerb, success: false, message: 'Ya has hecho eso.' };
  }

  // Si el \u00e9xito de la acci\u00f3n tambi\u00e9n tiene endReason (final del juego)
  if (matchedAction.endReason) {
    const resetResult = gameOperations.buildResetResult(matchedAction.successResponse, matchedAction.endReason);
    await gameOperations.applyReset(userId, user.userName, matchedAction.endReason);
    return resetResult;
  }

  return {
    action: canonicalVerb,
    success: true,
    object: matchedAction.object && matchedAction.object.name,
    message: matchedAction.successResponse,
    stateAdded: statusKey
  };
}

module.exports = { execute };
