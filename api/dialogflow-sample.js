const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');

/**
 * Send a query to the dialogflow agent, and return the query result.
 * @param {string} projectId The project to be used
 */
async function runSample(projectId = 'quijote-oukbse') {
  // A unique identifier for the given session
  const sessionId = uuid.v4();

  // Create a new session
  const sessionClient = new dialogflow.SessionsClient({
    keyFilename: './credentials/quijote-oukbse-a0f6dccc3a9b.json'
  });
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

  // The text query request.
  
  await doInteraction(sessionClient, sessionPath, 'hola');
  await doInteraction(sessionClient, sessionPath, 'si');
  await doInteraction(sessionClient, sessionPath, 'don manuel');
  await doInteraction(sessionClient, sessionPath, 'medio');
}

async function doInteraction(sessionClient, sessionPath, text) {
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text,
        languageCode: 'es-ES',
      },
    },
  };

  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  console.log('Detected intent');
  const result = responses[0].queryResult;
  console.log(`  Query: ${result.queryText}`);

  if (result.fulfillmentMessages.length) {
    const lines = result.fulfillmentMessages.map(msg => msg.text && msg.text.text.join('<br>'));
    console.log(lines.join('<br>'));
  } else if (result.fulfillmentText) {
    console.log(`  Response: ${result.fulfillmentText}`);
  }
  if (result.intent) {
    console.log(`  Intent: ${result.intent.displayName}`);
  } else {
    console.log(`  No intent matched.`);
  }
}

runSample();