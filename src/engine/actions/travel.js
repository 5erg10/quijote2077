const { convertPlaceNameToCanonical, getPlaceById, checkTravelIsPosible, calculateDistanceBetweenPlaces } = require('../../repositories/place.repository');
const usersDao = require('../../repositories/user.repository');
const arrayUtils = require('../../utils/arrayUtils');
const { normalize, createPlaceNameComposed } = require('../../utils/stringUtils');
const gameOperations = require('../gameOperations');
const countIntents = require('../../utils/countIntents');
const { isNight } = require('../../utils/time');

const execute = async (intent, userId, user) => {

    if (!intent.place) {
      await countIntents.count(userId);
      return { action: 'viajar', success: false, message: 'No entendi el nombre del lugar al que quieres ir, me lo puedes repetir?' };
    }

    const currentPlace = user.currentRoom;
    const placesKnown = user.placesKnown || [];
    const placeToTravel = `${convertPlaceNameToCanonical(intent.place)}${intent.origin ? `_${intent.origin}` : ''}`;

    if (normalize(currentPlace.id) === normalize(placeToTravel)) {
      await countIntents.count(userId);
      return { action: 'viajar', success: false, message: '¡Ya estás en este lugar!' };
    }

    // Busco y devuelvo de la lista de places los datos del lugar al que quiere viajar
    const place = await getPlaceById(placeToTravel, currentPlace);

    if (!place) {
      await countIntents.count(userId);
      return { action: 'viajar', success: false, message: 'Nadie ha oído hablar de ese lugar nunca!' };
    }

    const placeToTravelIsAvailable = await checkTravelIsPosible(place, user);

    if (!placeToTravelIsAvailable) {
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
    const distance = calculateDistanceBetweenPlaces(currentPlace, place);
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
    let updatedPlaces = [...placesKnown];
    if (!arrayUtils.includesNormalized(updatedPlaces, place.id)) {
      updatedPlaces.push(place.id);
    }

    Object.assign(user, { currentRoom: place, hungry: newHungry, placesKnown: updatedPlaces });
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

module.exports = { execute };
