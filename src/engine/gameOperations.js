const usersDao = require('../repositories/user.repository');

// Construye un resultado de reset sin depender de 'agent'
function buildResetResult(message, reason) {
  return {
    action: 'reset',
    gameOver: true,
    reason,
    message,
    imageUrl: reason === 'death' || reason === 'hungry' ? 'images/places/blackDeath.jpg' : null,
    restartMessage: reason !== 'end' ? '\n\nSi deseas iniciar una nueva partida, escribe <b>reiniciar</b>' : '\n\nCONTINUARÁ...'
  };
}

async function applyReset(userId, userName, reason) {
  if (reason === 'end') {
    const coordinates = { lat: 39.5137458, lng: -3.0046506 };
    await usersDao.addUser(userId, userName, coordinates);
  } else {
    await usersDao.removeUser(userId);
  }
}

module.exports = { buildResetResult, applyReset };
