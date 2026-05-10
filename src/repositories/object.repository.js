const usersDao = require('./user.repository');
const { normalize } = require('../utils/stringUtils');

function checkRequirementStatusAllowed(user, objectName) {
  let statusOk = true;
  let objectNeededOk = true;
  const object = user.objectsList[objectName];
  if(!object) {
    return false;
  }
  const objectHasRequiredStatus = object?.requirementStatus?.map(status => normalize(status)) || [];
  const objectHasRequirementObject = object?.requirementObject?.map(obj => normalize(obj)) || [];;
  if (objectHasRequiredStatus?.length) {
    if(user.states) {
      let requirementStatusCont = 0;
      user.states.map(status => {
        //some objects has more than 1 status required to success
        if (objectHasRequiredStatus.includes(normalize(status))) {
          requirementStatusCont += 1;
        };
      });
      const statusLength = object.numOfRequirementsNeeded || object.requirementStatus?.length;
      statusOk = requirementStatusCont >= statusLength
    } else {
      statusOk = false;
    }
  }
  if (objectHasRequirementObject?.length) {
    if(user.objects) {
      let requirementObjectsCont = 0;
      user.objects.map(currentObject => {
         //some objects has more than 1 object required to success
         if (object.requirementObject.includes(normalize(currentObject.name))) {
          requirementObjectsCont += 1;
         };
      });
      objectNeededOk = requirementObjectsCont >=  object.requirementObject?.length;
    } else {
      objectNeededOk = false;
    }
  }
  return statusOk && objectNeededOk;
}

function getObjectsByUserId(userId) {
  if(!userId) {
    throw new Error('Se requiere usuario a consultar');
  }

  return usersDao.getUserById(userId).then(user => {
      if(user) {
          return user.objects;
      }
  });
}

function getObjectByObjectId(user, objectName) {
  if(!user) {
    throw new Error('Se requiere usuario');
  }

  if(!objectName) {
    throw new Error('Se requiere objeto a consultar');
  }


  let objectFound;
  if(user.objects && user.objects.length) {
    objectFound = user.objects.find(element => element.name == objectName);
  }

  return objectFound?Promise.resolve(objectFound):Promise.reject('Object not found');
}

function deleteObjectByUser(userId, user, objectName) {
  if(!userId) {
      throw new Error('Se requiere identificador de usuario');
  } else if(!user) {
      throw new Error('Se requiere usuario');
  } else if(!objectName) {
      throw new Error('Se requiere objeto a borrar');
  }

  let object = user.objects.find(item => normalize(item.name) === normalize(objectName));
  if (object) {
    let difficulty = { level: user.difficulty.level, maxCapacity: user.difficulty.maxCapacity + object.weight };
    Object.assign( user, { difficulty, objects: user.objects.filter(item => normalize(item.name) !== normalize(objectName)), intents: 0});
  }
  return usersDao.updateUser(userId, user);
}

function addObject(userId, user, objectName) {
  if(!userId) {
      throw new Error('Se requiere identificador de usuario');
  } else if(!user) {
      throw new Error('Se requiere usuario');
  } else if(!objectName) {
      throw new Error('Se requiere objeto a borrar');
  }

  let objectsTaken = user.objects;
  let errorLog = 'repeated';
  let toTake = false;
  const allowedState = checkRequirementStatusAllowed(user, objectName);
  const isOverweight = (user.difficulty.maxCapacity - user.objectsList[objectName].weight) < 0;
  const objectAvailableOnCurrentPlace = Object.values(user.objectsList).filter(obj => obj.currentPlace == user.currentRoom.id);
  const isIncluded = objectsTaken ? objectsTaken.map(item => item.name).includes(objectName) : false;

  if (allowedState) {
    if (!isOverweight) {
      if (objectAvailableOnCurrentPlace) {
        if(!isIncluded) {
          toTake = true;
          user.objectsList[objectName].currentPlace = 'none';
          user.objectsList[objectName].jointToSuccess = true;
          if(objectsTaken && objectsTaken.length) {
            objectsTaken.push(user.objectsList[objectName]);
          } else {
            objectsTaken = [user.objectsList[objectName]];
          }
        } else {
          errorLog = user.objectsList[objectName].objectTakenYet;
        }
      } else {
        errorLog = user.objectsList[objectName].unFindResponse;
      }
    } else {
      errorLog = 'Llevas demasiadas cosas, te gusta pensar que eres tan fuerte que puedes cargar con todo, pero no. Si quieres coger más cosas tendras que deshacerte de algo.'
    }
  } else {
    errorLog = user.objectsList[objectName].failResponse;
  }

  if(toTake) {
    let difficulty = { level: user.difficulty.level, maxCapacity: user.difficulty.maxCapacity - user.objectsList[objectName].weight };
    Object.assign( user, { difficulty: difficulty, objects: objectsTaken, intents: 0 });
    return usersDao.updateUser(userId, user);
  } else {
    return Promise.reject(errorLog);
  }
}

module.exports = { getObjectByObjectId, getObjectsByUserId, deleteObjectByUser, addObject };
