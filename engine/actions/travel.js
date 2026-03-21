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
    return { action: 'viajar', success: false, message: 'Nadie ha oído hablar de ese lugar nunca!' };
  }

  if (placeName === selectedPlace) {
    await countIntents.count(userId);
    return { action: 'viajar', success: false, message: '\u00a1Ya estás en este lugar!' };
  }

  let place;
  try {
    place = await placesDao.getPlaceById(selectedPlace, user.room);
  } catch (e) {
    await countIntents.count(userId);
    return { action: 'viajar', success: false, message: 'Nadie ha oído hablar de ese lugar nunca!' };
  }

  if (!place) {
    await countIntents.count(userId);
    return { action: 'viajar', success: false, message: 'Nadie ha oído hablar de ese lugar nunca!' };
  }

  // Comprobar requisitos de acceso
  if (!arrayUtils.isSubset(place.requirementStatus || [], user.states || [])) {
    await countIntents.count(userId);
    return { action: 'viajar', success: false, message: place.failResponse || 'No puedes ir allí ahora mismo.' };
  }

  const distance = calculateDistance(user.room[placeName], place);
  const newHungry = user.hungry - distance;

  if (newHungry <= 0) {
    return gameOperations.buildResetResult('Te encuentras muy débil para seguir caminando. Tu vista se nubla y caes desmayado en el suelo.', 'hungry');
  }

  // Actualizar ubicación
  const newRoom = { [selectedPlace]: place };
  let updatedPlaces = [...(user.placesKnown || [])];
  if (!updatedPlaces.includes(selectedPlace)) updatedPlaces.push(selectedPlace);

  Object.assign(user, { room: newRoom, hungry: newHungry, placesKnown: updatedPlaces });
  await usersDao.updateUser(userId, user);

  // Objetos presentes en el nuevo lugar
  const objectsInPlace = Object.values(user.objectsList || {})
    .filter(o => o.currentPlace === selectedPlace)
    .map(o => (o.jointToSuccess ? o.ordinaryDescription : o.originDescription))
    .filter(Boolean)
    .join(' ');

  // Imagen del lugar (día/noche)
  const images = place.media && place.media.images || [];
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
