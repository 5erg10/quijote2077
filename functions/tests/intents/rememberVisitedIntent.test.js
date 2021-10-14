const handleRequest = require('../utils/handleRequest');
const usersDao = require('../../dao/users.js');

test('No visited places yet', () => {

  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
      { 
        userName:'victorman', 
        placesKnown: [] 
      } ));

    return handleRequest({
        intent: 'Recordar visitados',
        payload: {
          user: 'victorman'
        }
      })
      .then(response => {
        expect(response.status).toBe(200);
        expect(response.body.join('')).toMatch('No has visitado aún a ningún sitio. ¡Acabas de empezar!');
      });
})

test('Remember my visited places', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
      { 
        userName:'victorman', 
        placesKnown: ['acantilado', 'alcoba'] 
      } ));

    return handleRequest({
        intent: 'Recordar visitados',
        payload: {
          user: 'victorman'
        }
      })
      .then(response => {
        expect(response.status).toBe(200);
        expect(response.body.join('')).toMatch('Ya has visitado los siguientes lugares: acantilado, alcoba');
      });
})