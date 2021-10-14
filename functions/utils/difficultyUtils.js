const placesDao = require('../dao/places');
const placeNames = placesDao.getPlaceNames();
const items = placesDao.getItems();
const replaces = onlyUnique(placeNames.concat(items));

function textByDifficulty(text, user) {
  if (user.difficulty.level === 'facil') {
    let boldText = text;
    

    replaces.forEach(place =>
      boldText = boldText.replace(new RegExp(`(\\W)${place}(\\W|$)`, 'g'), `$1*${place}*$2`).replace(/\*\*/g, '*')
    );

    return boldText;
  }

  return text;
}

function getHelp(user, intentName) {
  
  if (intentName === 'Viajar' ) {
    return travelHelp(user);
  }
  
  return genericHelp(user);
}

function genericHelp(user) {
  const room = (Object.keys(user.room) || [])[0];
  const actionsDone = user.room.actions || [];
  const actions = placesDao.getPlaceActions(room);
  const connectedRooms = placesDao.getConnectedRooms(room);

  let response = `📝Aquí tienes algo de ayuda: \n\n - Estás en ${room}. `;

  if (connectedRooms.length) {
    response += '\n - Desde aquí puedes ir a '
    response += connectedRooms.map(room => `*${room}*`).join(' ') + '. ';
    response = response.replace(/(.*)(\* \*)/, '$1* y *');
  }

  if (actionsDone.length < actions.length) {
    response += '\n - Quizás puedas hacer algo con: ';
    
    if (actions.length > 1) {
      response += onlyUnique(actions.map(el => el.object && `*${el.object.name}*`)).join(', ') + '...';
      response = response.replace(/(.*)(\* \*)/, '$1* y *');
    } else {
      response += actions[0].object && actions[0].object.name;
    }

    response += '.';
  }


  return response;
}

function travelHelp(user) {
  const places = user.placesKnown || [];
  let response = 'Recuerda que has visitado ya estos sitios: \n    ';

  if (places.length) {
    response += places.join('\n    ');
    return response;
  } else {
    return '';
  }
}

function onlyUnique(values) { 
  return Array.from(new Set(values));
}

module.exports = { textByDifficulty, getHelp };
