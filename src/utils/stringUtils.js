/**
 * Normaliza un string eliminando tildes/diacríticos y pasando a minúsculas.
 * Permite comparar "zaguan" == "zaguán", "Habitacion" == "habitación", etc.
 */
const normalize = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const createPlaceNameComposed = (placeName) => {
  if (!placeName.includes('_')) return placeName;
  const [nombre, origen] = placeName.split('_');
  return `${nombre} ${origen.endsWith('a') ? 'de la' : 'del'} ${origen}`;
}

module.exports = { normalize, createPlaceNameComposed };