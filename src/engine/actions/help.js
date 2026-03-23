const { getHelp } = require('../../utils/difficultyUtils');

async function execute(intent, userId, user) {
  const helpText = getHelp(user, 'ayuda');
  return {
    action: 'ayuda',
    success: true,
    message: helpText || 'Explora el lugar, examina los objetos e interactúa con tu entorno.'
  };
}

module.exports = { execute };
