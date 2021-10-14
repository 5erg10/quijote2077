const handleRequest = require('../utils/handleRequest');
const usersDao = require('../../dao/users.js');
const objectsDao = require('../../dao/objects.js');

beforeEach(() => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve({user: 'foo'}));
  jest.spyOn(objectsDao, 'getObjectsByUserId')
});

test('Inventory empty', () => {
  objectsDao.getObjectsByUserId.mockImplementation(() =>  Promise.resolve([]));

    return handleRequest({
        intent: 'Inventario',
        payload: {
          user: 'victorman'
        }
      })
      .then(response => {
        expect(response.status).toBe(200);
        expect(response.body.join('')).toMatch('No tienes nada en tu inventario');
      });
});

test('Inventory with objects', () => {
  
  objectsDao.getObjectsByUserId.mockImplementation(() =>  
    Promise.resolve([ 
      { name: 'llave', type: 'util' }, 
      { name: 'patata', type: 'food' }
    ]));

  return handleRequest({
      intent: 'Inventario',
      payload: {
        user: 'victorman'
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Tienes en tu inventario los siguientes objetos: llave, patata');
    });
});
