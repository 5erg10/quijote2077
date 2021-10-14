const handleRequest = require('../utils/handleRequest');
const usersDao = require('../../dao/users.js');

beforeEach(() => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( { userName:'victorman', coordinates: {} } ));
});

test("Remember user intent assistant response does not crash", () => {
    return handleRequest({
        intent: 'Recordar el nombre',
        payload: {
          user: 'victormanuelpueblanext'
        }
      })
      .then(response => {
        expect(response.status).toBe(200);
        expect(response.body.join('')).toMatch('Que memoria la tuya, tu nombre es victorman');
      });
})
