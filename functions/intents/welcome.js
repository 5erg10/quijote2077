const contextDao = require('../dao/context');

function welcomeResponse({ body = {}}) {
    return agent => {
      
      agent.add('Hola aventurero!, no sé si eres un valiente o un inconsciente al saludarme, pero en fin, ya lo descubriremos si estas dispuesto a embarcarte en esta aventura. ¿Quieres comenzar la gesta para convertirte en un ingenioso hidalgo?');

      return Promise.resolve();
    };
}

module.exports = { welcomeResponse };
