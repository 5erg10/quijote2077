const placesDao = require('../repositories/place.repository');
const placeNames = placesDao.getPlaceNames();
const items = placesDao.getItems();
const replaces = onlyUnique(placeNames.concat(items));

// Añade negritas en las partes del texto que coincidan con lugares de la app para facilitar el juego
function textByDifficulty(text, user) {
  if (user.difficulty.level === 'facil') {
    const escapedPlaces = replaces.map(place => place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`\\b(${escapedPlaces.join('|')})\\b`, 'gi');

    return text.replace(regex, '<b>$1</b>');
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
  const formatter = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' });
  const room = (Object.keys(user.room) || [])[0];
  const actionsDone = user.room.actions || [];
  const actions = placesDao.getPlaceActions(room);
  const connectedRooms = placesDao.getConnectedRooms(room);

  let response = `📝Aquí tienes algo de ayuda: \n\n - Estás en ${room}. `;

  if (connectedRooms.length) {
    const roomsString = formatter.format(connectedRooms.map(room => `<b>${room}</b>`));
    response += `\n - Desde aquí puedes ir a ${roomsString}.`;
  }

  if (actionsDone.length < actions.length) {
    response += '\n - Quizás puedas hacer algo con: ';

    if (actions.length > 1) {
      const objectsString = formatter.format(onlyUnique(actions.map(el => `<b>${el.object?.name || ''}</b>`)));
      response += objectsString;
    } else {
      response += actions[0].object && actions[0].object.name;
    }

    response += '.';
  }


  return response;
}

function travelHelp(user) {
  const places = user.placesKnown || [];
  let response = 'Recuerda que has visitado ya estos sitios: \n    ';

  if (places.length) {
    response += places.join('\n    ');
    return response;
  } else {
    return '';
  }
}

function onlyUnique(values) {
  return Array.from(new Set(values));
}

module.exports = { textByDifficulty, getHelp };
