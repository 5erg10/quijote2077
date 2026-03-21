/**
 * Normaliza un string eliminando tildes/diacríticos y pasando a minúsculas.
 * Permite comparar "zaguan" == "zaguán", "Habitacion" == "habitación", etc.
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Comprueba si todos los elementos de arr están en target,
 * usando comparación normalizada (sin tildes, minúsculas).
 */
const isSubset = (arr, target) => {
  if (arr == undefined) return true;
  if (arr && target == undefined) return false;
  const normalizedTarget = target.map(normalize);
  return arr.every(v => normalizedTarget.includes(normalize(v)));
};

/**
 * Comprueba si value está en arr usando comparación normalizada.
 */
function includesNormalized(arr, value) {
  if (!arr || !value) return false;
  const normalizedValue = normalize(value);
  return arr.some(item => normalize(item) === normalizedValue);
}

module.exports = { normalize, isSubset, includesNormalized };
