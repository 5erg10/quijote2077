const handleRequest = require('../utils/handleRequest');
const usersDao = require('../../dao/users');
const objectsDao = require('../../dao/objects');

/* LEAVE OBJECTS ACTION TESTS */
test('Leave object that i do have', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      objects:[ { name: 'cosita' } ],
      room: { cocina: { branch: 0, 'step': 3 } }
    } ));
  
  jest.spyOn(usersDao, 'updateUser').mockImplementation(() => Promise.resolve({}));

  jest.spyOn(objectsDao, 'deleteObjectByUser')
    .mockImplementation(() =>  Promise.resolve(true));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'tirar',
        object: ['cosita']
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Has dejado cosita en el suelo');
    });
})

test('Leave object that i do not have', () => {
    jest.spyOn(usersDao, 'getUserById')
      .mockImplementation(() =>  Promise.resolve( 
      { 
        userName: 'victorman',
        room: { 'cocina': { 'branch': 0, 'step': 3 } }
      } ));

    jest.spyOn(objectsDao, 'deleteObjectByUser')
      .mockImplementation(() =>  Promise.reject('Object not found'));

    return handleRequest({
        intent: 'Acciones',
        payload: {
          user: 'victorman',
          action: 'tirar',
          object: ['cosita']
        }
      })
      .then(response => {
        expect(response.status).toBe(200);
        expect(response.body.join('')).toMatch('No dispones del objeto cosita del que deseas deshacerte');
      });
})

