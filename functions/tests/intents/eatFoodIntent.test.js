const handleRequest = require('../utils/handleRequest');
const usersDao = require('../../dao/users');
const objectsDao = require('../../dao/objects');

beforeEach(() => {
  jest.spyOn(usersDao, 'updateUser').mockImplementation(() => Promise.resolve({}));
})

/* EAT FOOD ACTION TESTS */
test('Eating food that i do have', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      hungry: 20,
      objects:[ { name: 'comida', type: 'food', lifePoints: 20 } ],
      room: { cocina: { branch: 0, 'step': 3 } }
    } ));

  jest.spyOn(objectsDao, 'deleteObjectByUser')
    .mockImplementation(() =>  Promise.resolve(true));

  jest.spyOn(objectsDao, 'getObjectByObjectId')
    .mockImplementation(() =>  Promise.resolve({ name: 'comida', type: 'food', lifePoints: 20 }));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'comer',
        object: ['comida']
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Te comes comida sin masticar y sientes cómo has rejuvenecido un poco más');
    });
})

test('Eating food that i dont have', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      hungry: 20,
      objects:[ { name: 'cosita', type: 'util' } ],
      room: { cocina: { branch: 0, 'step': 3 } }
    } ));

  jest.spyOn(objectsDao, 'getObjectByObjectId')
    .mockImplementation(() =>  Promise.reject('Object not found'));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'comer',
        object: ['comida']
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Aún no dispones de ese manjar');
    });
})

test('Eating inedible thing', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      hungry: 20,
      objects:[ { name: 'cosita', type: 'util' } ],
      room: { cocina: { branch: 0, 'step': 3 } }
    } ));

  jest.spyOn(objectsDao, 'getObjectByObjectId')
    .mockImplementation(() =>  Promise.resolve({ name: 'cosita', type: 'util' }));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'comer',
        object: ['comida']
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Eso no se puede comer');
    });
})