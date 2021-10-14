const placesList = require('./places.json');

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

function getPlaceById(placeId, room = {}) {
  const roomValues = Object.values(room) || [];
  const currentPlace = roomValues[0] || {};

  if(!placeId) {
    throw new Error('Se requiere identificador de lugar');
  }

  console.log('getPlaceById currentPlace : ' + JSON.stringify(currentPlace));

  const place = placesList[getNearestPlace(placeId, currentPlace)];

  return place?Promise.resolve(place):Promise.reject('place not found');
}

function getPlaceNames() {
  return Object.keys(placesList);
}

function getItems() {
  const keys = Object.keys(placesList);
  const items = {};

  keys.forEach(key => {
    placesList[key].actions.forEach(item => {
      if(item.object && item.object.name) {
        items[item.object.name] = 1;
      }
    });
  })
  return Object.keys(items);
}

function getPlaceActions(place) {
  const actions = placesList[place].actions || [];
  return onlyUnique(actions);
}

function getConnectedRooms(place) {
  return placesList[place].connectedRooms || [];
}

function onlyUnique(values) { 
  return Array.from(new Set(values));
}

function getNearestPlace(placeId, room = {}) {
  const { branch, step } = room;

  if (synonims.includes(placeId)) {
    console.log('Has synonim: ');

    const choices = synonimMap
      .find(arr => arr.includes(placeId))
      .map(name => ({name, ...placesList[name]}));

    console.log('Options ', JSON.stringify(choices.map(item => item.name)));

    console.log(`Try travel from branch: ${branch} step: ${step}`);
    
    let bestOption = choices.reduce((curr, select) => {
      if (curr.branch === branch &&
          Math.abs(curr.step - step) < Math.abs(select.step - step)) {
          console.log(`Better option ${curr.name} :    ${curr.step - step} < ${select.step - step}`)
        return curr;
      }
      return select;
    }, { branch: 999, step: 999 }) || {};
    
    console.log('best option -- ' + JSON.stringify(bestOption));

    return bestOption && bestOption.name ? bestOption.name : placeId;
  }

  return placeId;
}
module.exports = { getPlaces, getPlaceById, getPlaceNames, getItems, getPlaceActions, getConnectedRooms, getNearestPlace };
