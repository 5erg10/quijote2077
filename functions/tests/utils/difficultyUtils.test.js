const difficultyUtils = require('../../utils/difficultyUtils');

test('Should add bold to objects and places on easy level', () => {
  const user = { difficulty: { level: 'facil', maxCapacity: 99999 }};
  const text = 'Los libros polvorientos destacan en una estantería situada hacia la izquierda. De todos ellos hay un libro que te llama especialmente la atención';

  expect(difficultyUtils.textByDifficulty(text, user)).toMatch('*libro*');
});

test('Should not bold to objects and places on medium level', () => {
  const user = { difficulty: { level: 'media', maxCapacity: 100 }};
  const text = 'Los libros polvorientos destacan en una estantería situada hacia la izquierda. De todos ellos hay un libro que te llama especialmente la atención';

  expect(difficultyUtils.textByDifficulty(text, user)).toMatch(' libro ');
});

test('Should not bold to objects and places on hard level', () => {
  const user = { difficulty: { level: 'dificil', maxCapacity: 50 }};
  const text = 'Los libros polvorientos destacan en una estantería situada hacia la izquierda. De todos ellos hay un libro que te llama especialmente la atención';

  expect(difficultyUtils.textByDifficulty(text, user)).toMatch(' libro ');
});
