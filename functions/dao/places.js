const placesList = require('./places.json');
const { normalize, includesNormalized } = require('../utils/arrayUtils');

const synonimMap = [
  [ 'alcoba', 'habitación', 'dormitorio' ]
];
const synonims = [];

Object.values(synonimMap)
  .forEach(roomNames =>
    roomNames.forEach(name => synonims.push(name)));

function getPlaces() {
  return placesList;
}

/**
 * Busca un lugar por ID normalizando tildes y mayúsculas.
 * Así "zaguan" encuentra "zaguán" y viceversa.
 */
function getPlaceById(placeId, room = {}) {
  if (!placeId) throw new Error('Se requiere identificador de lugar');

  const roomValues = Object.values(room) || [];
  const currentPlace = roomValues[0] || {};

  // Resolver el nombre real del lugar (puede ser sinónimo o tener variante)
  const resolvedId = getNearestPlace(placeId, currentPlace);
  const place = placesList[resolvedId];

  if (place) return Promise.resolve(place);

  // Fallback: buscar por normalización en todas las claves
  const normalizedInput = normalize(placeId);
  const matchingKey = Object.keys(placesList).find(
    key => normalize(key) === normalizedInput
  );

  return matchingKey
    ? Promise.resolve(placesList[matchingKey])
    : Promise.reject('place not found');
}

function getPlaceNames() {
  return Object.keys(placesList);
}

function getItems() {
  const keys = Object.keys(placesList);
  const items = {};
  keys.forEach(key => {
    placesList[key].actions.forEach(item => {
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
 * Devuelve los connectedRooms del lugar, buscando también
 * por nombre normalizado para tolerar tildes.
 */
function getConnectedRooms(placeName) {
  // Búsqueda exacta primero
  if (placesList[placeName]) {
    return placesList[placeName].connectedRooms || [];
  }
  // Fallback normalizado
  const normalizedInput = normalize(placeName);
  const matchingKey = Object.keys(placesList).find(
    key => normalize(key) === normalizedInput
  );
  return matchingKey ? (placesList[matchingKey].connectedRooms || []) : [];
}

function onlyUnique(values) {
  return Array.from(new Set(values));
}

function getNearestPlace(placeId, room = {}) {
  const { branch, step } = room;

  if (includesNormalized(synonims, placeId)) {
    const choices = synonimMap
      .find(arr => includesNormalized(arr, placeId))
      .map(name => ({ name, ...placesList[name] }));

    let bestOption = choices.reduce((curr, select) => {
      if (
        curr.branch === branch &&
        Math.abs(curr.step - step) < Math.abs(select.step - step)
      ) {
        return curr;
      }
      return select;
    }, { branch: 999, step: 999 }) || {};

    return bestOption && bestOption.name ? bestOption.name : placeId;
  }

  return placeId;
}

module.exports = {
  getPlaces,
  getPlaceById,
  getPlaceNames,
  getItems,
  getPlaceActions,
  getConnectedRooms,
  getNearestPlace
};
