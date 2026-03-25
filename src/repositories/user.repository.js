const admin = require('firebase-admin');

const serviceAccount = require('../../credentials/quijote2077-firebase.json');
const objectOriginLocation = require('../../data/objectByPlacesOrigin.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://quijote-2077-firebase-default-rtdb.europe-west1.firebasedatabase.app/'
  });
}

const updateUser = (userId, newData) => {
    return admin.database().ref(`users/${userId}`).update(newData);
}

const getUserById = (userId) => {
  if (!userId) throw new Error('Se requiere identificador de usuario');
  return admin.database().ref(`users/${userId}`).once('value').then(snapshot => snapshot.val() || {});
}

const getUsers = () => {
  return admin.database().ref('users').once('value');
}

const addUser = (userAccount, username, level, coordinates) => {
  const capacityMap = { facil: 9999999, medio: 100, dificil: 50 };
  return admin.database().ref(`users/${userAccount}`).set({
    room: { biblioteca: { step: 0, branch: 0 } },
    placesKnown: ['biblioteca'],
    objects: [],
    states: [],
    hungry: 100,
    objectsList: objectOriginLocation,
    userName: username,
    coordinates,
    difficulty: {
      level,
      maxCapacity: capacityMap[level ?? 'medio']
    }
  });
}

const removeUser = (userAccount) => {
  return admin.database().ref(`users/${userAccount}`).remove();
}

module.exports = { updateUser, addUser, getUserById, getUsers, removeUser };
