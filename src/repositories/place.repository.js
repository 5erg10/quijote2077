const placesList = require('../../data/places.json');
const { includesNormalized } = require('../utils/arrayUtils');
const { normalize } = require('../utils/stringUtils');
const stringUtils = require('../utils/stringUtils');

const synonymMap = {
  "habitacion": [ 'alcoba', 'habitación', 'dormitorio' ],
  "comedor": [ "salon", "comedor" ]
};

function getPlaces() {
  return placesList;
}

const convertPlaceNameToCanonical = (placeName) => {
  let normalisedPlaceName = normalize(placeName);
  let placeNameCanonicalConverted;
  Object.entries(synonymMap).forEach(([canonicalPlaceName, synonyms]) => {
    if (!!synonyms.find(synonym => normalize(synonym) == normalisedPlaceName)) placeNameCanonicalConverted = canonicalPlaceName;
  });
  return placeNameCanonicalConverted || normalisedPlaceName;
}

/**
 * Busca un lugar por ID normalizando tildes y mayúsculas.
 * Así "zaguan" encuentra "zaguán" y viceversa.
 * Si hay varias opciones, devuelve la estancia mas cercana a donde estas
 */
const getPlaceById = (placeId, currentRoom = {}) => {
  return new Promise((resolve, reject) => {

    if(!placeId) return reject('place not found');

    const specificPlaceFinded = Object.keys(placesList).find(placeName => normalize(placeName) == normalize(placeId));

    if(!!specificPlaceFinded) return resolve(placesList[specificPlaceFinded]);

    const allPlacesOptions = Object.keys(placesList).reduce((acc, placeName) => {
      if(normalize(placeName).includes(placeId)) acc.push({ ...placesList[placeName], id: placeName });
      return acc;
    }, []);

    if(allPlacesOptions.length == 1) return resolve(allPlacesOptions[0]);

    const nearestRoom = getNearestPlace(allPlacesOptions, currentRoom);

    return resolve(nearestRoom);

  });
}

function getPlaceNames() {
  return Object.keys(placesList);
}

function getItems() {
  const keys = Object.keys(placesList);
  const items = {};
  keys.forEach(key => {
    placesList[key].actions?.forEach(item => {
      if (item.object && item.object.name) {
        items[item.object.name] = 1;
      }
    });
  });
  return Object.keys(items);
}

function getPlaceActions(place) {
  const actions = placesList[place] && placesList[place].actions || [];
  return onlyUnique(actions);
}

/**
 * Devuelve si es posible viajar a una zona
 * Solo es posible si a donde quiere viajar esta conectado directamente a 
 * la zona actual o es una zona en la que ya haya estado
 */
function checkTravelIsPosible(place, userData) {
  const roomsConectedToCurenPlace = userData?.currentRoom.connectedRooms;
  const placesKnown = userData?.placesKnown;
  return roomsConectedToCurenPlace.includes(place.id) || placesKnown.includes(place.id);
}

function onlyUnique(values) {
  return Array.from(new Set(values));
}

function getNearestPlace(placesOptions, currentRoom) {
  let placesWithDistance = [];
  for (const place of placesOptions) {
    if(place.origin == currentRoom.origin) { 
      placesWithDistance = [{distance: 0, room: place}];
      break;
    }
    placesWithDistance.push({distance: calculateDistanceBetweenPlaces(currentRoom, place), room: place});
  }
  return placesWithDistance.sort((a,b) => a.distance - b.distance)[0].room;
}

const calculateDistanceBetweenPlaces = (origin = {}, destiny = {}) => {
  return (Math.abs((origin.branch || 0) - (destiny.branch || 0)) * 2) +
    (Math.abs((origin.step || 0) - (destiny.step || 0)) * 2);
}

module.exports = {
  getPlaces,
  getPlaceById,
  getPlaceNames,
  getItems,
  getPlaceActions,
  checkTravelIsPosible,
  getNearestPlace,
  convertPlaceNameToCanonical,
  calculateDistanceBetweenPlaces
};
