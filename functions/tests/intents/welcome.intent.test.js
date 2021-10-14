const handleRequest = require('../utils/handleRequest');
const contextDao = require('../../dao/context');

test('Welcome intent assistant does not crash', () => {

  jest.spyOn(contextDao, 'getUserId')
    .mockImplementation(() =>  Promise.resolve('userTest'));

    return handleRequest({
        intent: 'Default Welcome Intent'
      })
      .then(response => {
        expect(response.status).toBe(200);
        expect(response.body.join('')).toMatch('Hola aventurero');
      });
});
