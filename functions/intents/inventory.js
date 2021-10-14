const contextDao = require('../dao/context');
const objectsDao = require('../dao/objects');

function showInventory(request) {
    return agent => {
        const userAccount = contextDao.getUserId(request);
        return objectsDao.getObjectsByUserId(userAccount).then(objects => {
          const message = objects && objects.length?`Tienes en tu inventario los siguientes objetos: ${objects.map(item => item.name).join(', ')}`:'No tienes nada en tu inventario';
          return agent.add(message);
      })
    }
}

module.exports = { showInventory };