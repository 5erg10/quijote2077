const dialogflow = require('@google-cloud/dialogflow');
const projectId = 'primerproyecto-lkbltx'


async function runIntent(sessionId, text) {
  // Create a new session
  const sessionClient = new dialogflow.SessionsClient({
    keyFilename: './credentials/quijote2077cred.json'
  });

  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text,
        languageCode: 'es-ES',
        payload: {
          name: 'as',
          parameters: {
              foo: 'bar',
          }
        }
      },
    },
    queryParams: {
      payload: {
        foo: 'bar',
      }
    }
  };

  let output = '';
 
  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  const result = responses[0].queryResult;

  if (result.fulfillmentMessages.length) {
    const lines = result.fulfillmentMessages.map(msg => msg.text && msg.text.text.join('<br>'));
    output = lines.join('<br>');
  } else if (result.fulfillmentText) {
    output = result.fulfillmentText
  }

  if (result.intent) {
    console.log(`  Intent: ${result.intent.displayName}`);
  } else {
    console.log(`  No intent matched.`);
  }
  
  console.log('output: ', {text: output, intent: result.intent.displayName});
  return {text: output, intent: result.intent.displayName};
}

module.exports = function(req, res) {
  const { text, id } = req.query;

  if (!text || !id) {
    return res.send(401)
  }

  runIntent(id, text).then(response => {
    res.send(response)
  });
}