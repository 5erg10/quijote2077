const usersDao = require('../repositories/user.repository');

// Construye un resultado de reset sin depender de 'agent'
function buildResetResult(message, reason) {
  return {
    action: 'reset',
    gameOver: true,
    reason,
    message,
    imageUrl: reason === 'death' || reason === 'hungry' ? 'images/places/blackDeath.jpg' : null,
    restartMessage: reason !== 'end' ? '<br><br>Si deseas iniciar una nueva partida, escribe <b>reiniciar</b>' : '<br><br>CONTINUARÁ...<br><br>Si deseas iniciar una nueva partida, escribe <b>reiniciar</b>'
  };
}

async function applyReset(userId, user, reason) {
  if (reason === 'end') {
    await usersDao.addUser(userId, user.userName, user.difficulty.level, user.coordinates);
  } else {
    await usersDao.removeUser(userId);
  }
}

module.exports = { buildResetResult, applyReset };
