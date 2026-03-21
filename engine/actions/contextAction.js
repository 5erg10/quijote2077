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

  // Resolver el verbo canónico: el LLM puede haber devuelto
  // el verbo canónico correcto o un sinónimo. En ambos casos
  // buscamos el verbo canónico que existe en places.json.
  const validActions = getValidActionsForPlace(place);
  const canonicalVerb = resolveCanonicalVerb(intent.action, validActions);

  if (canonicalVerb === 'fallback') {
    await countIntents.count(userId);
    return { action: intent.action, success: false, message: 'Eso no se puede hacer aqu\u00ed.' };
  }

  // Buscar la acción en el lugar por verbo canónico y objeto
  let matchedAction = (place.actions || []).find(
    a => a.action === canonicalVerb && a.object && a.object.name === objectName
  );

  // Si no hay objeto o no coincide, buscar solo por verbo canónico
  if (!matchedAction) {
    matchedAction = (place.actions || []).find(a => a.action === canonicalVerb);
  }

  if (!matchedAction) {
    await countIntents.count(userId);
    return { action: canonicalVerb, success: false, message: 'Eso no se puede hacer aqu\u00ed.' };
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
    return { action: canonicalVerb, success: false, message: matchedAction.failResponse };
  }

  // Ejecutar: guardar estado con el verbo canónico
  const objectKey = matchedAction.object && matchedAction.object.name ? `_${matchedAction.object.name}` : '';
  const statusKey = `${canonicalVerb}${objectKey}`;
  try {
    await statesDao.addStatus(userId, user, statusKey);
  } catch (e) {
    return { action: canonicalVerb, success: false, message: 'Ya has hecho eso.' };
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
