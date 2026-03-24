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

module.exports = { normalize };