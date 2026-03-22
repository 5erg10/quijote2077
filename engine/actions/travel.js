const placesDao = require('../../functions/dao/places');
const usersDao = require('../../functions/dao/users');
const arrayUtils = require('../../functions/utils/arrayUtils');
const gameOperations = require('../../functions/business/gameOperations');
const countIntents = require('../../functions/utils/countIntents');
const { isNight } = require('../../functions/utils/time');

const execute = (intent, userId, user) => {
  return new Promise( async (resolve, reject) => {

    const selectedPlace = intent.place;
    const placeName = Object.keys(user.room)[0];
    const placesKnown = user.placesKnown || [];
  
    let place, connectedRooms;
  
    if (!selectedPlace) {
      await countIntents.count(userId);
      return resolve({ action: 'viajar', success: false, message: 'Nadie ha oído hablar de ese lugar nunca!' });
    }
  
    if (arrayUtils.normalize(placeName) === arrayUtils.normalize(selectedPlace)) {
      await countIntents.count(userId);
      return resolve({ action: 'viajar', success: false, message: '¡Ya estás en este lugar!' });
    }
  
    try {
      place = await placesDao.getPlaceById(selectedPlace, user.room);
    } catch (e) {
      await countIntents.count(userId);
      return resolve({ action: 'viajar', success: false, message: 'Nadie ha oído hablar de ese lugar nunca!' });
    }
  
    if (!place) {
      await countIntents.count(userId);
      return resolve({ action: 'viajar', success: false, message: 'Nadie ha oído hablar de ese lugar nunca!' });
    }
  
    try {
      connectedRooms = placesDao.getConnectedRooms(placeName);
    } catch (e) {
      connectedRooms = [];
    }
  
    // Comparar normalizando tildes en ambos sentidos
    const isConnected = arrayUtils.includesNormalized(connectedRooms, selectedPlace);
    const isKnown = arrayUtils.includesNormalized(placesKnown, selectedPlace);
  
    if (!isConnected && !isKnown) {
      await countIntents.count(userId);
      return resolve({
        action: 'viajar',
        success: false,
        message: `No puedes ir directamente a ${selectedPlace}. Solo puedes moverte a lugares conectados o que ya hayas visitado.`
      });
    }
  
    // Comprobar requisitos de acceso
    if (!arrayUtils.isSubset(place.requirementStatus || [], user.states || [])) {
      await countIntents.count(userId);
      return resolve({ action: 'viajar', success: false, message: place.failResponse || 'No puedes ir allí ahora mismo.' });
    }
  
    // Comprobar energía
    const distance = calculateDistance(user.room[placeName], place);
    const newHungry = user.hungry - distance;
  
    if (newHungry <= 0) {
      const resetResult = gameOperations.buildResetResult(
        'Te encuentras muy débil para seguir caminando. Tu vista se nubla y caes desmayado en el suelo.',
        'hungry'
      );
      await gameOperations.applyReset(userId, user.userName, 'hungry');
      return resolve(resetResult);
    }
  
    // Actualizar estado
    const newRoom = { [selectedPlace]: place };
    let updatedPlaces = [...placesKnown];
    if (!arrayUtils.includesNormalized(updatedPlaces, selectedPlace)) {
      updatedPlaces.push(selectedPlace);
    }
  
    Object.assign(user, { room: newRoom, hungry: newHungry, placesKnown: updatedPlaces });
    await usersDao.updateUser(userId, user);
  
    const objectsInPlace = Object.values(user.objectsList || {})
      .filter(o => arrayUtils.normalize(o.currentPlace) === arrayUtils.normalize(selectedPlace))
      .map(o => (o.jointToSuccess ? o.ordinaryDescription : o.originDescription))
      .filter(Boolean)
      .join(' ');
  
    const images = (place.media && place.media.images) || [];
    const imageUrl = images.length > 1 && isNight(user) ? images[1] : images[0];
  
    return resolve({
      action: 'viajar',
      success: true,
      place: selectedPlace,
      placeDescription: place.description,
      objectsInPlace,
      imageUrl,
      distance,
      newHungry,
      longTrip: distance > 4
    });
  })
}

const calculateDistance = (origin = {}, destiny = {}) => {
  return (Math.abs((origin.branch || 0) - (destiny.branch || 0)) * 2) +
    (Math.abs((origin.step || 0) - (destiny.step || 0)) * 2);
}

module.exports = { execute };
