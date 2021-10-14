const moment = require('moment');

require('./sun');

function isDay({ coordinates }) {
  var sunset = moment(new Date().sunset(coordinates.lat, coordinates.lng));
  var sunrise = moment(new Date().sunrise(coordinates.lat, coordinates.lng));
  var now = moment();

  if (now.isBefore(sunset) && now.isAfter(sunrise)) {
    return true;
  }

  return false;
}

function isNight(user) {
  return !isDay(user);
} 
module.exports = {
  isDay,
  isNight
};
