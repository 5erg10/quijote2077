const objectsDao = require('../../repositories/object.repository');
const countIntents = require('../../utils/countIntents');

async function execute(intent, userId, user) {
  const objectName = intent.object;

  const parsedObjectName = Object.keys(user.objectsList).find(obj => objectName.toLowerCase().includes(obj.toLowerCase()) || obj.toLowerCase().includes(objectName.toLowerCase()));

  if (!parsedObjectName || !user.objectsList[parsedObjectName]) {
    await countIntents.count(userId);
    return { action: 'coger', success: false, message: '\u00bfQué quieres coger? No veo nada así por aquí.' };
  }

  try {
    await objectsDao.addObject(userId, user, parsedObjectName);
    return {
      action: 'coger',
      success: true,
      object: parsedObjectName,
      message: user.objectsList[parsedObjectName].successResponse
    };
  } catch (errorMsg) {
    await countIntents.count(userId);
    return { action: 'coger', success: false, message: errorMsg };
  }
}

module.exports = { execute };
