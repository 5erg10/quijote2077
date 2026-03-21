const placesDao = require('../../functions/dao/places');
const usersDao = require('../../functions/dao/users');
const arrayUtils = require('../../functions/utils/arrayUtils');
const gameOperations = require('../../functions/business/gameOperations');
const countIntents = require('../../functions/utils/countIntents');
const { isNight } = require('../../functions/utils/time');

async function execute(intent, userId, user) {
  const selectedPlace = intent.place;
  const placeName = Object.keys(user.room)[0];

  if (!selectedPlace) {
    await countIntents.count(userId);
    return { action: 'viajar', success: false, message: 'Nadie ha o\u00eddo hablar de ese lugar nunca!' };
  }

  if (placeName === selectedPlace) {
    await countIntents.count(userId);
    return { action: 'viajar', success: false, message: '\u00a1Ya est\u00e1s en este lugar!' };
  }

  let place;
  try {
    place = await placesDao.getPlaceById(selectedPlace, user.room);
  } catch (e) {
    await countIntents.count(userId);
    return { action: 'viajar', success: false, message: 'Nadie ha o\u00eddo hablar de ese lugar nunca!' };
  }

  if (!place) {
    await countIntents.count(userId);
    return { action: 'viajar', success: false, message: 'Nadie ha o\u00eddo hablar de ese lugar nunca!' };
  }

  // Comprobar accesibilidad: adyacente o ya visitado
  const currentPlaceData = await placesDao.getPlaceById(placeName).catch(() => null);
  const connectedRooms = (currentPlaceData && currentPlaceData.connectedRooms) || [];
  const placesKnown = user.placesKnown || [];

  if (!connectedRooms.includes(selectedPlace) && !placesKnown.includes(selectedPlace)) {
    await countIntents.count(userId);
    return {
      action: 'viajar',
      success: false,
      message: `No puedes ir directamente a ${selectedPlace}. Solo puedes moverte a lugares conectados o que ya hayas visitado.`
    };
  }

  // Comprobar requisitos de acceso (estados necesarios)
  if (!arrayUtils.isSubset(place.requirementStatus || [], user.states || [])) {
    await countIntents.count(userId);
    return { action: 'viajar', success: false, message: place.failResponse || 'No puedes ir all\u00ed ahora mismo.' };
  }

  // Comprobar energ\u00eda
  const distance = calculateDistance(user.room[placeName], place);
  const newHungry = user.hungry - distance;

  if (newHungry <= 0) {
    const resetResult = gameOperations.buildResetResult(
      'Te encuentras muy d\u00e9bil para seguir caminando. Tu vista se nubla y caes desmayado en el suelo.',
      'hungry'
    );
    await gameOperations.applyReset(userId, user.userName, 'hungry');
    return resetResult;
  }

  // Actualizar estado del usuario
  const newRoom = { [selectedPlace]: place };
  let updatedPlaces = [...placesKnown];
  if (!updatedPlaces.includes(selectedPlace)) updatedPlaces.push(selectedPlace);

  Object.assign(user, { room: newRoom, hungry: newHungry, placesKnown: updatedPlaces });
  await usersDao.updateUser(userId, user);

  const objectsInPlace = Object.values(user.objectsList || {})
    .filter(o => o.currentPlace === selectedPlace)
    .map(o => (o.jointToSuccess ? o.ordinaryDescription : o.originDescription))
    .filter(Boolean)
    .join(' ');

  const images = (place.media && place.media.images) || [];
  const imageUrl = images.length > 1 && isNight(user) ? images[1] : images[0];

  return {
    action: 'viajar',
    success: true,
    place: selectedPlace,
    placeDescription: place.description,
    objectsInPlace,
    imageUrl,
    distance,
    newHungry,
    longTrip: distance > 4
  };
}

function calculateDistance(origin = {}, destiny = {}) {
  return (Math.abs((origin.branch || 0) - (destiny.branch || 0)) * 2) +
    (Math.abs((origin.step || 0) - (destiny.step || 0)) * 2);
}

module.exports = { execute };
