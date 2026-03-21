const placesDao = require('../../functions/dao/places');
const usersDao = require('../../functions/dao/users');
const statesDao = require('../../functions/dao/states');
const arrayUtils = require('../../functions/utils/arrayUtils');
const gameOperations = require('../../functions/business/gameOperations');
const countIntents = require('../../functions/utils/countIntents');

async function execute(intent, userId, user) {
  const actionVerb = intent.action_verb || intent.action; // 'examinar', 'usar', etc.
  const objectName = intent.object;
  const placeName = Object.keys(user.room)[0];

  const place = await placesDao.getPlaceById(placeName);
  if (!place) {
    return { action: actionVerb, success: false, message: 'No puedo hacer eso aquí.' };
  }

  // Buscar acción en el lugar que coincida
  const matchedAction = (place.actions || []).find(
    a => a.action === actionVerb && a.object && a.object.name === objectName
  );

  if (!matchedAction) {
    await countIntents.count(userId);
    return { action: actionVerb, success: false, message: 'Eso no se puede hacer aquí.' };
  }

  // Verificar requisitos
  const requirementsOk =
    arrayUtils.isSubset(matchedAction.requirementObject || [], (user.objects || []).map(o => o.name)) &&
    arrayUtils.isSubset(matchedAction.requirementStatus || [], user.states || []);

  if (!requirementsOk) {
    if (matchedAction.endReason) {
      return gameOperations.buildResetResult(matchedAction.failResponse, matchedAction.endReason);
    }
    await countIntents.count(userId);
    return { action: actionVerb, success: false, message: matchedAction.failResponse };
  }

  // Ejecutar: guardar estado
  const statusKey = `${matchedAction.action}_${matchedAction.object.name}`;
  try {
    await statesDao.addStatus(userId, user, statusKey);
  } catch (e) {
    return { action: actionVerb, success: false, message: 'Ya has hecho eso.' };
  }

  return {
    action: actionVerb,
    success: true,
    object: objectName,
    message: matchedAction.successResponse,
    stateAdded: statusKey
  };
}

module.exports = { execute };
