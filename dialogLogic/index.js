// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('./firebase.initializers');//nos permite leer y escribir en la BBDD

// Intent modules
const welcomeIntent = require('./intents/welcome');
const fallbackIntent = require('./intents/fallback');
const rememberUserIntent = require('./intents/rememberUser');
const beginIntent = require('./intents/begin');
const travelIntent = require('./intents/travel');
const inventoryIntent = require('./intents/inventory');
const rememberVisitedIntent = require('./intents/rememberVisited');
const actionsIntent = require('./intents/actions');
const difficultyIntent = require('./intents/difficulty');
const helpIntent = require('./intents/help');
const countIntents = require('./utils/countIntents');

require('./utils/sun');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });

  let intentMap = new Map();

  function addIntent(name, fn, needsHelp) {
    intentMap.set(name, agent =>
      fn(agent).then(() => needsHelp && countIntents.checkIfNeedHelp(request, agent, name))
    );
  }

  addIntent('Default Welcome Intent', welcomeIntent.welcomeResponse(request));
  addIntent('Default Fallback Intent', fallbackIntent.fallback(request), true);
  addIntent('Recordar el nombre', rememberUserIntent.recoverUserName(request));
  addIntent('Guardar mi nombre', beginIntent.beginAdventure(request));
  addIntent('Viajar', travelIntent.recoverCurrentPlaceStep(request), true);
  addIntent('Inventario', inventoryIntent.showInventory(request));
  addIntent('Recordar visitados', rememberVisitedIntent.rememberVisited(request));
  addIntent('Acciones', actionsIntent.execute(request), true);
  addIntent('difficulty', difficultyIntent.difficulty(request))
  addIntent('Ayuda', helpIntent.execute(request))
  agent.handleRequest(intentMap);
});

