const placesDao = require('../../dao/places');

test('Should get nearest room', () => {
  const biblioteca = {step: 0, branch: 0};

  expect(placesDao.getNearestPlace('alcoba', biblioteca)).toBe('habitación');
  expect(placesDao.getNearestPlace('dormitorio', biblioteca)).toBe('habitación');
  expect(placesDao.getNearestPlace('habitación', biblioteca)).toBe('habitación');

});
