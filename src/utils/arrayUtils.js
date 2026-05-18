/**
 * Comprueba si todos los elementos de arr están en target,
 * usando comparación normalizada (sin tildes, minúsculas).
 */

const { normalize } = require('../utils/stringUtils');

const isSubset = (requirementsList, userRequirements) => {
  if (requirementsList == undefined) return true;
  if (requirementsList && userRequirements == undefined) return false;
  const normalizedTarget = userRequirements.map(normalize);
  for (const reqStatus of requirementsList) {
    if (!normalizedTarget.includes(normalize(reqStatus.name))) {
      return reqStatus.failResponse;
    }
  }
  return false;
};

/**
 * Comprueba si value está en arr usando comparación normalizada.
 */
function includesNormalized(arr, value) {
  if (!arr || !value) return false;
  const normalizedValue = normalize(value);
  return arr.some(item => normalize(item) === normalizedValue);
}

module.exports = { isSubset, includesNormalized };
