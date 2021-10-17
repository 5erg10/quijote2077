const NO_USER = 'nouser';

function getUserId({ body = {} }) {
  const payload = body.originalDetectIntentRequest && body.originalDetectIntentRequest.payload;
  const sesId = body.session && body.session.replace(/.*\//, '');

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

module.exports = { getUserId };
