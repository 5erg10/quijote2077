const handleRequest = require('../utils/handleRequest');

test('Fallback intent assistant does not crash', () => {

    return handleRequest({
        intent: 'Default Fallback Intent'
      })
      .then(response => {
        expect(response.status).toBe(200);
        expect(response.body.join('')).toMatch('No te entiendo');
      });
});
