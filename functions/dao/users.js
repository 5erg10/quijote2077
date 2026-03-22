var admin = require('firebase-admin');
var serviceAccount = require('../../credentials/quijote2077-firebase.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://quijote-2077-firebase-default-rtdb.europe-west1.firebasedatabase.app/'
  });
}

const objectOriginLocation = require('../../gameData/objectByPlacesOrigin.json');

function updateUser(userId, newData) {
  return admin.database().ref(`users/${userId}`).update(newData);
}

function getUserById(userId) {
  if (!userId) throw new Error('Se requiere identificador de usuario');
  return admin.database().ref(`users/${userId}`).once('value').then(snapshot => snapshot.val() || {});
}

function getUsers() {
  return admin.database().ref('users').once('value');
}

function addUser(userAccount, username, coordinates) {
  return admin.database().ref(`users/${userAccount}`).set({
    room: { biblioteca: { step: 0, branch: 0 } },
    placesKnown: ['biblioteca'],
    objects: [],
    states: [],
    hungry: 100,
    objectsList: objectOriginLocation,
    userName: username,
    coordinates
  });
}

function removeUser(userAccount) {
  return admin.database().ref(`users/${userAccount}`).remove();
}

module.exports = { updateUser, addUser, getUserById, getUsers, removeUser };
