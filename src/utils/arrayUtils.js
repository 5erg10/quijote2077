/**
 * Comprueba si todos los elementos de arr están en target,
 * usando comparación normalizada (sin tildes, minúsculas).
 */

const stringUtils = require('../utils/stringUtils');

const isSubset = (arr, target) => {
  if (arr == undefined) return true;
  if (arr && target == undefined) return false;
  const normalizedTarget = target.map(stringUtils.normalize);
  return arr.every(v => normalizedTarget.includes(stringUtils.normalize(v)));
};

/**
 * Comprueba si value está en arr usando comparación normalizada.
 */
function includesNormalized(arr, value) {
  if (!arr || !value) return false;
  const normalizedValue = stringUtils.normalize(value);
  return arr.some(item => stringUtils.normalize(item) === normalizedValue);
}

module.exports = { isSubset, includesNormalized };
