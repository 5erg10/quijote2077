const placesDao = require('../../functions/dao/places');
const statesDao = require('../../functions/dao/states');
const arrayUtils = require('../../functions/utils/arrayUtils');
const gameOperations = require('../../functions/business/gameOperations');
const countIntents = require('../../functions/utils/countIntents');
const { resolveCanonicalVerb, getValidActionsForPlace } = require('../../llm/actionContext');

// Importamos travel para delegar cuando la acción tiene travelTo
const travelAction = require('./travel');

async function execute(intent, userId, user) {
  const objectName = intent.object;
  const placeName = Object.keys(user.room)[0];

  const place = await placesDao.getPlaceById(placeName);
  if (!place) {
    return { action: intent.action, success: false, message: 'No puedo hacer eso aquí.' };
  }

  // Resolver verbo canónico
  const validActions = getValidActionsForPlace(place);
  const canonicalVerb = resolveCanonicalVerb(intent.action, validActions);

  if (canonicalVerb === 'fallback') {
    await countIntents.count(userId);
    return { action: intent.action, success: false, message: 'Eso no se puede hacer aquí.' };
  }

  // Buscar acción por verbo+objeto (match exacto), luego solo por verbo
  let matchedAction;
  if (objectName) {
    matchedAction = (place.actions || []).find(
      a => a.action === canonicalVerb && a.object && a.object.name === objectName
    );
    if (!matchedAction) {
      matchedAction = (place.actions || []).find(a => a.action === canonicalVerb);
    }
  } else {
    matchedAction = (place.actions || []).find(a => a.action === canonicalVerb);
  }

  if (!matchedAction) {
    await countIntents.count(userId);
    return { action: canonicalVerb, success: false, message: 'Eso no se puede hacer aquí.' };
  }

  // --- VERIFICAR REQUISITOS ---
  const userStates = user.states || [];
  const userObjects = (user.objects || []).map(o => o.name);

  const statusOk = arrayUtils.isSubset(matchedAction.requirementStatus || [], userStates);
  const objectsOk = arrayUtils.isSubset(matchedAction.requirementObject || [], userObjects);
  const requirementsOk = statusOk && objectsOk;

  if (!requirementsOk) {
    if (matchedAction.endReason) {
      const resetResult = gameOperations.buildResetResult(matchedAction.failResponse, matchedAction.endReason);
      await gameOperations.applyReset(userId, user.userName, matchedAction.endReason);
      return resetResult;
    }
    await countIntents.count(userId);
    return { action: canonicalVerb, success: false, message: matchedAction.failResponse };
  }

  // --- EJECUTAR ---

  // Si la acción tiene travelTo, delegamos al motor de viaje en lugar de
  // guardar un estado. Esto permite acciones narrativas como "cruzar portal"
  // que en realidad son viajes con requisito previo (leer_libro, etc.).
  if (matchedAction.travelTo) {
    return travelAction.execute(
      { action: 'viajar', place: matchedAction.travelTo },
      userId,
      user
    );
  }

  // Guardar estado
  const objectKey = matchedAction.object && matchedAction.object.name
    ? `_${matchedAction.object.name}`
    : '';
  const statusKey = `${canonicalVerb}${objectKey}`;

  try {
    await statesDao.addStatus(userId, user, statusKey);
  } catch (e) {
    return { action: canonicalVerb, success: false, message: 'Ya has hecho eso.' };
  }

  // Si el éxito también tiene endReason (final del juego)
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
