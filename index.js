const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 4500;

const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'credentials/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'credentials/cert.pem')),
};

const {WebhookClient} = require('dialogflow-fulfillment');

// Intent modules
const welcomeIntent = require('./functions/intents/welcome');
const fallbackIntent = require('./functions/intents/fallback');
const rememberUserIntent = require('./functions/intents/rememberUser');
const beginIntent = require('./functions/intents/begin');
const travelIntent = require('./functions/intents/travel');
const inventoryIntent = require('./functions/intents/inventory');
const rememberVisitedIntent = require('./functions/intents/rememberVisited');
const actionsIntent = require('./functions/intents/actions');
const difficultyIntent = require('./functions/intents/difficulty');
const helpIntent = require('./functions/intents/help');
const responseIntent = require('./functions/intents/responses');
const countIntents = require('./functions/utils/countIntents');

require('./functions/utils/sun');

app.use(express.static("web"));

app.get('/', (request, response) => {
  response.redirect('/index.html');
});

app.get('/userstate', require('./api/userState'));

app.get('/api/intent/', require('./api/intent'));

app.post('/webhook', express.json(),(request, response) => {
  
  const agent = new WebhookClient({ request, response });

  let intentMap = new Map();

  console.log('texto: ', request.body.queryResult.queryText)

  function addIntent(name, fn, needsHelp) {
    intentMap.set(name, agent => {
      return fn(agent).then(() => needsHelp && countIntents.checkIfNeedHelp(request, agent, name))
    });
  }

  addIntent('Default Welcome Intent', welcomeIntent.welcomeResponse(request));
  addIntent('Default Fallback Intent', fallbackIntent.fallback(request), true);
  addIntent('Recordar el nombre', rememberUserIntent.recoverUserName(request));
  addIntent('Guardar mi nombre', beginIntent.beginAdventure(request));
  addIntent('Viajar', travelIntent.recoverCurrentPlaceStep(request), true);
  addIntent('Inventario', inventoryIntent.showInventory(request));
  addIntent('Recordar visitados', rememberVisitedIntent.rememberVisited(request));
  addIntent('Acciones', actionsIntent.execute(request), true);
  addIntent('difficulty', difficultyIntent.difficulty(request));
  addIntent('Ayuda', helpIntent.execute(request));
  addIntent('Afirmacion', responseIntent.afirmative(request));
  addIntent('negacion', responseIntent.negative(request));
  agent.handleRequest(intentMap);
});

app.listen(port, () => console.log("Server is running at " + port));