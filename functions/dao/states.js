const usersDao = require('../dao/users');

function getStatesByUserId(userId) {
  if(!userId) {
    throw new Error('Se requiere usuario a consultar');
  }

  return usersDao.getUserById(userId).then(user => {
      if(user) {
          return user.states;
      }
  });
}

function getStatusByStatusId(user, status) {
  if(!user) {
    throw new Error('Se requiere usuario');
  }

  if(!status) {
    throw new Error('Se requiere estado a consultar');
  }
  
  console.log(`getStatusByStatusId -> Estados actuales: ${user.states}`);

  let statusFound;
  if(user.states && user.states.length) {
    statusFound = user.states.find(element => element == status);
  }

  return statusFound?Promise.resolve(status):Promise.reject('Status not found');
}

function deleteStatusByUser(userId, user, status) {
  if(!userId) {
      throw new Error('Se requiere identificador de usuario');
  } else if(!user) {
      throw new Error('Se requiere usuario');
  } else if(!status) {
      throw new Error('Se requiere status a borrar');
  }

  return getStatusByStatusId(user, status).then(status => {
    Object.assign( user, { states: user.states.filter(item => item !== status)});
    return usersDao.updateUser(userId, user);
  });
}

function addStatus(userId, user, status) {
  if(!userId) {
      throw new Error('Se requiere identificador de usuario');
  } else if(!user) {
      throw new Error('Se requiere usuario');
  } else if(!status) {
      throw new Error('Se requiere estado a borrar');
  }

  let states;
  let toTake = false;
  if(user.states && user.states.length) {
    states = user.states;
    console.log(`addStatus -> ${states} includes ${status}? ${states.includes(status)}`);
    if(!states.includes(status)) {
      toTake = true;
      states.push(status);
    }
  } else {
    toTake = true;
    states = [status];
  }

  if(toTake) {
    console.log('addStatus -> Status accepted');
    Object.assign( user, { states: states});
    return usersDao.updateUser(userId, user);
  } else {
    console.log('addStatus -> Status repeated');
    return Promise.reject('Status repeated');
  }
}

module.exports = { getStatesByUserId, deleteStatusByUser, addStatus };