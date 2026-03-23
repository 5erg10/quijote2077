const objectsDao = require('../../repositories/object.repository');
const countIntents = require('../../utils/countIntents');

async function execute(intent, userId, user) {
  const objectName = intent.object;

  if (!objectName || !user.objectsList[objectName]) {
    await countIntents.count(userId);
    return { action: 'coger', success: false, message: '\u00bfQué quieres coger? No veo nada así por aquí.' };
  }

  try {
    await objectsDao.addObject(userId, user, objectName);
    return {
      action: 'coger',
      success: true,
      object: objectName,
      message: user.objectsList[objectName].successResponse
    };
  } catch (errorMsg) {
    await countIntents.count(userId);
    return { action: 'coger', success: false, message: errorMsg };
  }
}

module.exports = { execute };
