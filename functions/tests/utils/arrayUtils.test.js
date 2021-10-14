const arrayUtils = require('../../utils/arrayUtils');

test('Empty Array is subset of any array', () => {
  expect(arrayUtils.isSubset([], ['one','two','three'])).toBe(true);
});

test('Array is not subset of empty array', () => {
  expect(arrayUtils.isSubset(['one','two'], [])).toBe(false);
});

test('Array is subset of another array', () => {
    expect(arrayUtils.isSubset(['one', 'two'], ['one','two','three'])).toBe(true);
});

test('Array is not subset of another array', () => {
  expect(arrayUtils.isSubset(['one', 'four'], ['one','two','three'])).toBe(false);
});

test('First array is undefined', () => {
  expect(arrayUtils.isSubset(undefined, ['one','two','three'])).toBe(true);
});

test('Second array is undefined', () => {
  expect(arrayUtils.isSubset(['one', 'four'], undefined)).toBe(false);
});