function addValueToKey(aMap, key, value) {
  let updatedMap = aMap || {};
  updatedMap[key] = updatedMap[key] || [];
  updatedMap[key].push(value);
  return updatedMap;
}

module.exports = { addValueToKey };
