const NO_USER = 'nouser';

function getUserId({ body = {} }) {
  const payload = body.originalDetectIntentRequest && body.originalDetectIntentRequest.payload;
  const sesId = body.session && body.session.replace(/.*\//, '');
  console.trace(`body -> ${JSON.stringify(body)}`);
  console.trace(`getUserId -> Request originalDetectIntentRequest: ${JSON.stringify(body.originalDetectIntentRequest)}`);

  const userMail = payload &&
    payload.data &&
    payload.data.data &&
    payload.data.data.personEmail;
  
  if (userMail) {
    return userMail.replace(/\.|@.*/g, '');
  }
  
  return payload && 
    payload.data && 
    payload.data.event &&
    payload.data.event.user || sesId || NO_USER;
}

/*function getValidDomain() {
    const userMail = JSON.stringify(request.body.originalDetectIntentRequest.payload.data.data.personEmail);
    return userMail.split('@')[1].split('.')[0];
}*/

module.exports = { getUserId };
