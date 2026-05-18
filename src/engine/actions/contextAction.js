const { addStatus } = require('../../repositories/state.repository');
const { updateUser } = require('../../repositories/user.repository');
const arrayUtils = require('../../utils/arrayUtils');
const { normalize } = require('../../utils/stringUtils')
const gameOperations = require('../gameOperations');
const countIntents = require('../../utils/countIntents');
const { resolveCanonicalVerb, getValidActionsForPlace } = require('../../utils/actionContext');

// Importamos travel para delegar cuando la acción tiene travelTo
const travelAction = require('./travel');

const execute = async (intent, userId, user) => {
    const objectName = intent.object;
    const currentPlace = user.currentRoom;
    const canonicalVerb = intent.action;

    if (canonicalVerb === 'fallback') {
      await countIntents.count(userId);
      return { action: intent.action, success: false, message: 'Eso no se puede hacer aquí.' };
    }

    // Buscar acción por verbo + objeto (match exacto), si no solo por verbo
    const matchedAction = (currentPlace.actions || []).find(a => a.action === canonicalVerb && (!!objectName ? normalize(objectName).includes(normalize(a.object?.name)) : true));
    
    if (!matchedAction) {
      await countIntents.count(userId);
      return { action: canonicalVerb, success: false, message: `No hay nada que ${canonicalVerb} aquí.` };
    }
    
    if (matchedAction.action == "descansar") {
      await updateUser(userId, { ...user, hungry: 100, intents: 0 });
      return {
      action: canonicalVerb,
      success: true,
      lifePoints: 100,
      newHungry: 100,
      message: matchedAction.successResponse,
    };
    }

    // --- VERIFICAR REQUISITOS ---
    const userStates = user.states || [];
    const userObjects = (user.objects || []).map(o => o.name);

    const statusFailed = arrayUtils.isSubset(matchedAction.requirementStatus || [], userStates);
    const objectFailed = arrayUtils.isSubset(matchedAction.requirementObject || [], userObjects);
    const requirementsOk = !statusFailed && !objectFailed;

    // Si el éxito tiene endReason end (final del juego)
    if (requirementsOk && matchedAction.endReason == 'end') {
      const resetResult = gameOperations.buildResetResult(matchedAction.successResponse, matchedAction.endReason);
      await gameOperations.applyReset(userId, user, matchedAction.endReason);
      return resetResult;
    }

    if (!requirementsOk) {
      if (matchedAction.endReason == 'death') {
        const resetResult = gameOperations.buildResetResult(matchedAction.failResponse, matchedAction.endReason);
        await gameOperations.applyReset(userId, user, matchedAction.endReason);
        return resetResult;
      }
      await countIntents.count(userId);
      return { action: canonicalVerb, success: false, message: statusFailed || objectFailed };
    }

    // Guardar estado
    const objectKey = matchedAction?.object?.name
      ? `_${matchedAction.object.name}`
      : '';

    const statusKey = `${canonicalVerb}${objectKey}_${currentPlace.name}`;

    try {
      await addStatus(userId, user, statusKey);
    } catch (e) {
      return { action: canonicalVerb, success: false, message: 'Ya has hecho eso.' };
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

    return {
      action: canonicalVerb,
      success: true,
      object: matchedAction.object && matchedAction.object.name,
      message: matchedAction.successResponse,
      stateAdded: statusKey
    };
}

module.exports = { execute };
