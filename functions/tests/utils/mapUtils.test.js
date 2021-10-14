const mapUtils = require('../../utils/mapUtils');

test('Add value to undefined map', () => {
  expect(mapUtils.addValueToKey(undefined, 'place', 'object')).toStrictEqual({ 'place': [ 'object' ] });
});

test('Add value to empty map', () => {
  expect(mapUtils.addValueToKey({}, 'place', 'object')).toStrictEqual({ 'place': [ 'object' ] });
});

test('Add value to empty list value on map', () => {
  expect(mapUtils.addValueToKey({'place': []}, 'place', 'object')).toStrictEqual({ 'place': [ 'object' ] });
});

test('Add value to populated map', () => {
  expect(mapUtils.addValueToKey({ 'place': [ 'object1' ] }, 'place', 'object2')).toStrictEqual({ 'place': [ 'object1', 'object2'] });
});
