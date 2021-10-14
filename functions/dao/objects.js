const usersDao = require('../dao/users');

function checkRequirementStatusAllowed(user, objectName) {
  let statusOk = true;
  let objectNeededOk = true;
  const objectHasRequiredStatus = user.objectsList[objectName] && user.objectsList[objectName].requirementStatus;
  const objectHasRequirementObject = user.objectsList[objectName] && user.objectsList[objectName].requirementObject;
  console.log('requirements: ', objectHasRequiredStatus, user.objectsList[objectName].requirementStatus, objectHasRequirementObject, user.objectsList[objectName].requirementObject);
  if (objectHasRequiredStatus) {
    if(user.states) {
      let requirementStatusCont = 0;
      user.states.map(status => {
        //some objects has more than 1 status required to success
        if (user.objectsList[objectName].requirementStatus.includes(status)) {
          requirementStatusCont += 1;
        };
      });
      statusOk = requirementStatusCont >= user.objectsList[objectName].requirementStatus.length
      console.log('status needed ok: ', requirementStatusCont, statusOk);
    } else {
      statusOk = false;
    }
  }
  if (objectHasRequirementObject) {
    if(user.objects) {
      let requirementObjectsCont = 0;
      user.objects.map(currentObject => {
         //some objects has more than 1 object required to success
         if (user.objectsList[objectName].requirementObject.includes(currentObject)) {
          requirementObjectsCont += 1;
         };
      });
      objectNeededOk = requirementObjectsCont >= user.objectsList[objectName].requirementObject;
      console.log('objects needed ok: ', requirementObjectsCont, objectNeededOk);
    } else {
      objectNeededOk = false;
    }
  }
  console.log('status result: ', statusOk, objectNeededOk);
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
  
  console.log(`getObjectByObjectId -> Objetos disponibles: ${user.objects}`);

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

  let object = user.objects.find(item => item.name === objectName);
  if (object) {
    let difficulty = { level: user.difficulty.level, maxCapacity: user.difficulty.maxCapacity + object.weight };
    Object.assign( user, { difficulty, objects: user.objects.filter(item => item.name !== objectName)});
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
  const objectAvailableOnCurrentPlace = user.objectsList[objectName].currentPlace == Object.keys(user.room)[0];
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
    Object.assign( user, { difficulty: difficulty, objects: objectsTaken });
    return usersDao.updateUser(userId, user);
  } else {
    return Promise.reject(errorLog);
  }

}

module.exports = { getObjectByObjectId, getObjectsByUserId, deleteObjectByUser, addObject };