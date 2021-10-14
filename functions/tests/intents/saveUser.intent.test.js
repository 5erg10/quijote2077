const handleRequest = require('../utils/handleRequest');

test('Save my user intent assistant response does not crash', () => {

    return handleRequest({
        intent: 'Guardar mi nombre',
        payload: {
          user: 'Foo Bar'
        }
      })
      .then(response => {
        expect(response.status).toBe(200);
        expect(response.body.join('')).toMatch('Excelente nombre, Foo Bar');
      });
})
