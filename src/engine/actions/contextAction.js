const { addStatus } = require('../../repositories/state.repository');
const { updateUser } = require('../../repositories/user.repository');
const objectsDao = require('../../repositories/object.repository');
const arrayUtils = require('../../utils/arrayUtils');
const gameOperations = require('../gameOperations');
const countIntents = require('../../utils/countIntents');
const travelAction = require('./travel');

const execute = async (intent, userId, user) => {
    const currentPlace = user.currentRoom;
    const actionId = intent.action;

    if (actionId === 'fallback') {
      await countIntents.count(userId);
      return { action: 'fallback', success: false, message: 'Eso no se puede hacer aquí.' };
    }

    const matchedAction = (currentPlace.actions || []).find(a => a.id === actionId);

    if (!matchedAction) {
      await countIntents.count(userId);
      return { action: actionId, success: false, message: 'Eso no se puede hacer aquí.' };
    }

    if (matchedAction.id === 'descansar') {
      await updateUser(userId, { ...user, hungry: 100, intents: 0 });
      return {
        action: actionId,
        success: true,
        lifePoints: 100,
        newHungry: 100,
        message: matchedAction.successResponse,
      };
    }

    const userStates = user.states || [];
    const userObjects = (user.objects || []).map(o => o.name);

    const statusFailed = arrayUtils.isSubset(matchedAction.requirementStatus || [], userStates);
    const objectFailed = arrayUtils.isSubset(matchedAction.requirementObject || [], userObjects);
    const requirementsOk = !statusFailed && !objectFailed;

    if (requirementsOk && matchedAction.endReason === 'end') {
      const resetResult = gameOperations.buildResetResult(matchedAction.successResponse, matchedAction.endReason);
      await gameOperations.applyReset(userId, user, matchedAction.endReason);
      return resetResult;
    }

    if (!requirementsOk) {
      if (matchedAction.endReason === 'death') {
        const resetResult = gameOperations.buildResetResult(matchedAction.failResponse, matchedAction.endReason);
        await gameOperations.applyReset(userId, user, matchedAction.endReason);
        return resetResult;
      }
      await countIntents.count(userId);
      return { action: actionId, success: false, message: statusFailed || objectFailed };
    }

    const statusKey = matchedAction.id;

    try {
      await addStatus(userId, user, statusKey);
    } catch (e) {
      return { action: actionId, success: false, message: 'Ya has hecho eso.' };
    }

    if (matchedAction.discardObject) {
      await objectsDao.deleteObjectByUser(userId, user, matchedAction.discardObject);
    }

    if (matchedAction.travelTo) {
      return travelAction.execute(
        { action: 'viajar', place: matchedAction.travelTo },
        userId,
        user
      );
    }

    return {
      action: actionId,
      success: true,
      message: matchedAction.successResponse,
      stateAdded: statusKey
    };
}

module.exports = { execute };
