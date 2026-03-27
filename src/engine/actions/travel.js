const placesDao = require('../../repositories/place.repository');
const usersDao = require('../../repositories/user.repository');
const arrayUtils = require('../../utils/arrayUtils');
const { normalize, createPlaceNameComposed } = require('../../utils/stringUtils');
const gameOperations = require('../gameOperations');
const countIntents = require('../../utils/countIntents');
const { isNight } = require('../../utils/time');

const execute = async (intent, userId, user) => {
    const currentPlace = Object.keys(user.room)[0];
    const placesKnown = user.placesKnown || [];
    const placeOrigin = intent.origin;
    const placeToTravel = `${intent.place}${placeOrigin ? `_${placeOrigin}` : ''}`;

    let place, connectedRooms;

    if (!placeToTravel) {
      await countIntents.count(userId);
      return { action: 'viajar', success: false, message: 'Nadie ha oído hablar de ese lugar nunca!' };
    }

    if (normalize(currentPlace) === normalize(placeToTravel)) {
      await countIntents.count(userId);
      return { action: 'viajar', success: false, message: '¡Ya estás en este lugar!' };
    }

    try {
      place = await placesDao.getPlaceById(placeToTravel, user.room);
    } catch (e) {
      await countIntents.count(userId);
      return { action: 'viajar', success: false, message: 'Nadie ha oído hablar de ese lugar nunca!' };
    }

    if (!place) {
      await countIntents.count(userId);
      return { action: 'viajar', success: false, message: 'Nadie ha oído hablar de ese lugar nunca!' };
    }

    try {
      connectedRooms = placesDao.getConnectedRooms(currentPlace);
    } catch (e) {
      connectedRooms = [];
    }

    // Comparar normalizando tildes en ambos sentidos
    const isConnected = arrayUtils.includesNormalized(connectedRooms, placeToTravel);
    const isKnown = arrayUtils.includesNormalized(placesKnown, placeToTravel);

    if (!isConnected && !isKnown) {
      await countIntents.count(userId);
      return {
        action: 'viajar',
        success: false,
        message: `No puedes ir directamente ${placeToTravel.endsWith('a') ? 'a la' : 'al'} ${createPlaceNameComposed(placeToTravel)}. Solo puedes moverte a lugares conectados o que ya hayas visitado.`
      };
    }

    // Comprobar requisitos de acceso
    if (!arrayUtils.isSubset(place.requirementStatus || [], user.states || [])) {
      await countIntents.count(userId);
      return { action: 'viajar', success: false, message: place.failResponse || 'No puedes ir allí ahora mismo.' };
    }

    // Comprobar energía
    const distance = calculateDistance(user.room[currentPlace], place);
    const newHungry = user.hungry - distance;

    if (newHungry <= 0) {
      const resetResult = gameOperations.buildResetResult(
        'Te encuentras muy débil para seguir caminando. Tu vista se nubla y caes desmayado en el suelo.',
        'hungry'
      );
      await gameOperations.applyReset(userId, user.userName, 'hungry');
      return resetResult;
    }

    // Actualizar estado
    const newRoom = { [placeToTravel]: place };
    let updatedPlaces = [...placesKnown];
    if (!arrayUtils.includesNormalized(updatedPlaces, placeToTravel)) {
      updatedPlaces.push(placeToTravel);
    }

    Object.assign(user, { room: newRoom, hungry: newHungry, placesKnown: updatedPlaces });
    await usersDao.updateUser(userId, user);

    const objectsInPlace = Object.values(user.objectsList || {})
      .filter(o => normalize(o.currentPlace) === normalize(placeToTravel))
      .map(o => (o.jointToSuccess ? o.ordinaryDescription : o.originDescription))
      .filter(Boolean)
      .join(' ');

    const images = (place.media && place.media.images) || [];
    const imageUrl = images.length > 1 && isNight(user) ? images[1] : images[0];

    return {
      action: 'viajar',
      success: true,
      place: placeToTravel,
      placeDescription: place.description,
      objectsInPlace,
      imageUrl,
      distance,
      newHungry,
      longTrip: distance > 4
    };
}

const calculateDistance = (origin = {}, destiny = {}) => {
  return (Math.abs((origin.branch || 0) - (destiny.branch || 0)) * 2) +
    (Math.abs((origin.step || 0) - (destiny.step || 0)) * 2);
}

module.exports = { execute };
