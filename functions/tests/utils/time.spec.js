const time = require('../../utils/time');

const coordinates = { lat: 39.5137458, lng: -3.0046506};
const now = Date.now();
test('Check day detection', () => {

  jest.spyOn(Date.prototype, 'sunset').mockImplementation(() => now + 120 * 1000);
  jest.spyOn(Date.prototype, 'sunrise').mockImplementation(() => now - 120 * 1000);

  expect(time.isDay({ coordinates })).toBe(true);
  expect(time.isNight({ coordinates })).toBe(false);
});

test('Check night detection', () => {

  jest.spyOn(Date.prototype, 'sunset').mockImplementation(() => now - 120 * 1000);

  expect(time.isDay({ coordinates })).toBe(false);
  expect(time.isNight({ coordinates })).toBe(true);
});
