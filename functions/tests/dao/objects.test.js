const objectsDao = require('../../dao/objects.js');
const usersDao = require('../../dao/users.js');

test('Delete object in inventory', () => {
    const updateUserMock = jest.spyOn(usersDao, 'updateUser')
      .mockImplementation(() =>  Promise.resolve());

    return objectsDao.deleteObjectByUser(
      'victormanuelpueblanext', 
      {
        userName: 'victorman', 
        difficulty: { level: 'facil', maxCapacity: 99999 },
        objects: [ { name: 'espada', type: 'util', weight: 15 }, { name: 'llave', type: 'util', weight: 2 }]
      }, 
      'espada'
      ).then(() => {
        expect(updateUserMock).toHaveBeenCalledTimes(1);
      });
});

test('Delete non inventory object', () => {
  return objectsDao.deleteObjectByUser(
    'victormanuelpueblanext', 
    {
      userName: 'victorman', 
      difficulty: { level: 'facil', maxCapacity: 99999 },
      objects: [{ name: 'llave', type: 'util', weight: 2 }]
    }, 
    'espada'
    ).catch(e => 
      expect(e).toEqual('Object not found')
    );
});

test('Take new object on place not allowed due to overweight', () => {
  return objectsDao.addObject(
    'victormanuelpueblanext', 
    {
      userName: 'victorman', 
      difficulty: { level: 'media', maxCapacity: 16 },
      objects: [ { name: 'espada', type: 'util', weight: 15 }, { name: 'llave', type: 'util', weight: 2 }]
    }, 
    { name: 'armadura', type: 'util', weight: 35 }
    ).catch(e => 
      expect(e).toEqual('Object not allowed')
    );
});

test('Take new object on floor not allowed due to overweight', () => {
  return objectsDao.addObjectFromFloor(
    'victormanuelpueblanext', 
    {
      userName: 'victorman', 
      difficulty: { level: 'media', maxCapacity: 16 },
      objects: [ { name: 'espada', type: 'util', weight: 15 }, { name: 'llave', type: 'util', weight: 2 }],
      objectsByPlace: { 'zaguan': [ { name: 'rastrillo', type: 'util', weight: 15 } ] }
    }, 
    'rastrillo', 
    'zaguan'
    ).catch(e => 
      expect(e).toEqual('Object not allowed')
    );
});
