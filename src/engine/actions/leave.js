const objectsDao = require('../../repositories/object.repository');
const countIntents = require('../../utils/countIntents');
const { normalize } = require('../../utils/stringUtils');

const execute = async (intent, userId, user) => {

  const objectName = intent.object;
  const placeName = user.currentRoom.id;

  if (!objectName) {
    return { action: 'tirar', success: false, message: '\u00bfQué quieres tirar?' };
  }

  const hasObject = (user.objects || []).some(o => normalize(o.name) === normalize(objectName));
  
  if (!hasObject) {
    await countIntents.count(userId);
    return { action: 'tirar', success: false, message: `No llevas ningún ${objectName} encima.` };
  }

  const objectInObjectsList = user.objectsList[normalize(objectName)];

  // Actualizar currentPlace del objeto al lugar actual
  if (!!objectInObjectsList) {
    objectInObjectsList.currentPlace = placeName;
  }

  await objectsDao.deleteObjectByUser(userId, user, objectName);

  return {
    action: 'tirar',
    success: true,
    object: objectName,
    place: placeName,
    message: `Has dejado el ${objectName} en el suelo.`
  };
}

module.exports = { execute };
