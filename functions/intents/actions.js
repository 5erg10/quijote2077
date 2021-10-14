const placesDao = require('../dao/places');
const usersDao = require('../dao/users');
const statesDao = require('../dao/states');
const contextDao = require('../dao/context');
const arrayUtils = require('../utils/arrayUtils');
const gameOperations = require('../business/gameOperations');
const takeAction = require('../business/actions/takeAction');
const leaveAction = require('../business/actions/leaveAction');
const eatAction = require('../business/actions/eatAction');
const { textByDifficulty } = require('../utils/difficultyUtils');
const countIntents = require('../utils/countIntents');


const everyWhereActions = ['tirar','comer','coger'];
const genericFailResponse = 'Eso no se puede hacer aqui';

function execute(request) {
  return agent => {
    console.log('execute -> Agent Parameters: ' + JSON.stringify(agent.parameters));
    const action = agent.parameters.action;
    const objectName = agent.parameters.object;
    const userAccount = contextDao.getUserId(request);
    console.log(`execute -> Cuenta de usuario: ${userAccount}, action: ${action}, object: ${objectName}`);

    return usersDao.getUserById(userAccount).then(user => {
      const placeName = Object.keys(user.room)[0];
      console.log(`execute -> current place name: ${placeName}`);

      if(everyWhereActions.includes(action)) {
        return everyWhereActionsTreatment(agent, userAccount, user, action, objectName, placeName);
      } else {
        return placesDao.getPlaceById(placeName).then(currentPlace => {
          console.log(`execute -> current place value: ${JSON.stringify(currentPlace)}`);
          if(currentPlace) {
            return contextActionsTreatment(agent, userAccount, user, currentPlace, action, objectName);
          }
        });
      }
    });
  }
}

function contextActionsTreatment(agent, userAccount, user, place, action, objectName) {
  console.log(`contextActionsTreatment -> Searching action: ${action} and object: ${objectName} on list: ${place.actions}`)
  let currentAction = place.actions.find(actionObj => actionObj.action == action && actionObj.object.name == objectName);
  console.log(`contextActionsTreatment -> currentAction: ${JSON.stringify(currentAction)}`);
  let allowedAction = currentAction !== undefined;
  let requirementsOk;

  if(allowedAction) {
    console.log('contextActionsTreatment -> action allowed!');
    const objects = !user.objects?[]:user.objects;
    requirementsOk = arrayUtils.isSubset(currentAction.requirementObject, objects.map(item => item.name)) &&
      arrayUtils.isSubset(currentAction.requirementStatus, user.states);
  }

  let message;
  let endReason;

  if(!allowedAction) {
    console.log('contextActionsTreatment -> forbidden action!')
    message = genericFailResponse;
    countIntents.count(userAccount);
  } else if(!requirementsOk) {
    console.log('contextActionsTreatment -> requirements not met')
    message = currentAction.failResponse;
    endReason = currentAction.endReason;
  } else {
    console.log('contextActionsTreatment -> requirements are met')
    return statesDao.addStatus(userAccount, user, currentAction.action + '_' + currentAction.object.name)
      .then(() => agent.add(textByDifficulty(currentAction.successResponse, user)))
      .catch(e => {
        console.log(`Action error: ${e}`);
        agent.add(`Ya has hecho eso`);
      });
  }
  
  if(endReason) {
    return gameOperations.reset(agent, userAccount, user.userName, message, endReason);
  } else {
    agent.add(textByDifficulty(message, user));
  }
}

function everyWhereActionsTreatment(agent, userAccount, user, action, objectName, placeName) {
  switch(action) {
    case 'coger': 
      return takeAction.take(agent, userAccount, user, objectName)
    case 'tirar': 
      return leaveAction.leave(agent, userAccount, user, objectName, placeName);
    case 'comer': 
      return eatAction.eat(agent, userAccount, user, objectName);
    default:
      console.log('everyWhereActionsTreatment -> Action not supported');
      agent.add(genericFailResponse);
      countIntents.count(userAccount);
  }
}


module.exports = { execute };
