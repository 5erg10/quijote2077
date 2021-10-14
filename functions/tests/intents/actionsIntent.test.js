const handleRequest = require('../utils/handleRequest');
const usersDao = require('../../dao/users');
const placesDao = require('../../dao/places');
const objectsDao = require('../../dao/objects');
const statesDao = require('../../dao/states');

/* REQUIREMENTS TESTS */
test('Actions intent execution. Requirements not met', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      objects:[ { name: 'cosita', type: 'util' } ],
      room: { 'cocina': { 'branch': 0, 'step': 3 } }
    } ));
  
  jest.spyOn(usersDao, 'removeUser')
    .mockImplementation(() =>  Promise.resolve({}));

  jest.spyOn(placesDao, 'getPlaceById')
    .mockImplementation(() =>  Promise.resolve( 
      { 
          step: 3, 
          branch: 0,
          description: 'En la antigua y acogedora cocina, desnuda de todo lo que pueda recordar olorosas comidas, queda una triste alacena y, al fondo, una despensa',
          actions: [
            {   
              action: 'abrir',
              object: { name: 'alacena' },
              requirementStatus: ['poner_armadura'],
              successResponse: 'Una rata salta, te intenta morder, pero gracias a la armadura lo unico que consigue es romperse los dientes.',
              failResponse: 'La rata salta sobre tu hidalgo rostro perjudicando tus globos oculares, ya no estás en condiciones de continuar con un hidalga azaña',
              endReason:'death'
            }
          ],
          genericFailResponse: 'Eso no se puede hacer aqui'
        }
      ));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'abrir',
        object: ['alacena']
      }
    })
    .then(response => {
      expect(response.status).toBe(200); 
      expect(response.body.join('')).toMatch('La rata salta sobre tu hidalgo rostro perjudicando tus globos oculares, ya no estás en condiciones de continuar con un hidalga azaña');
    });
})


test('Actions intent execution. Requirements are met', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      difficulty: { level: 'facil', maxCapacity: 99999 },
      objects:[ { name: 'cosita', type: 'util' } ],
      states:['poner_armadura'],
      room: { 'cocina': { 'branch': 0, 'step': 3 } }
    } ));

  jest.spyOn(statesDao, 'addStatus')
    .mockImplementation(() => Promise.resolve(true));

  jest.spyOn(placesDao, 'getPlaceById')
    .mockImplementation(() =>  Promise.resolve( 
      { 
          step: 3, 
          branch: 0,
          description: 'En la antigua y acogedora cocina, desnuda de todo lo que pueda recordar olorosas comidas, queda una triste alacena y, al fondo, una despensa',
          actions: [
            {   
              action: 'abrir',
              object: { name: 'alacena' },
              requirementStatus: ['poner_armadura'],
              successResponse: 'Una rata salta, te intenta morder, pero gracias a la armadura lo unico que consigue es romperse los dientes.',
              failResponse: 'La rata salta sobre tu hidalgo rostro perjudicando tus globos oculares, ya no estás en condiciones de continuar con un hidalga azaña'
            }
          ],
          genericFailResponse: 'Eso no se puede hacer aqui'
        }
      ));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'abrir',
        object: ['alacena']
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Una rata salta, te intenta morder, pero gracias a la *armadura* lo unico que consigue es romperse los dientes.');
    });
})

/* FAIL ACTIONS TESTS */
test('Actions intent execution. Fail due to repeated action', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      difficulty: { level: 'facil', maxCapacity: 99999 },
      objects:[ { name: 'cosita', type: 'util' } ],
      states:['poner_armadura'],
      room: { 'cocina': { 'branch': 0, 'step': 3 } }
    } ));

  jest.spyOn(statesDao, 'addStatus')
    .mockImplementation(() => Promise.reject('Status repeated'));

  jest.spyOn(placesDao, 'getPlaceById')
    .mockImplementation(() =>  Promise.resolve( 
      {
          step: 3, 
          branch: 0,
          description: 'En la antigua y acogedora cocina, desnuda de todo lo que pueda recordar olorosas comidas, queda una triste alacena y, al fondo, una despensa',
          actions: [
            {   
              action: 'abrir',
              object: { name: 'alacena' },
              requirementStatus: ['poner_armadura'],
              successResponse: 'Una rata salta, te intenta morder, pero gracias a la armadura lo unico que consigue es romperse los dientes.',
              failResponse: 'La rata salta sobre tu hidalgo rostro perjudicando tus globos aculares, ya no estas en condiciones que continuar con un hidalga azaña'
            }
          ],
          genericFailResponse: 'Eso no se puede hacer aqui'
        }
      ));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'abrir',
        object: ['alacena']
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Ya has hecho eso');
    });
})

test('Actions intent Forbidden action and object', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      difficulty: { level: 'facil', maxCapacity: 99999 },
      objects:['llave'],
      room: { 'cocina': { 'branch': 0, 'step': 3 } }
    } ));

  jest.spyOn(objectsDao, 'addObject')
    .mockImplementation(() => Promise.reject('Object repeated'));

  jest.spyOn(placesDao, 'getPlaceById')
    .mockImplementation(() =>  Promise.resolve( 
      {
          step: 3, 
          branch: 0,
          description: 'En la antigua y acogedora cocina, desnuda de todo lo que pueda recordar olorosas comidas, queda una triste alacena y, al fondo, una despensa',
          actions: [
            {   
              action: 'coger',
              object: 'llave',
              successResponse: 'Guardala bien, nunca se sabe'
            }
          ],
          genericFailResponse: 'Eso no se puede hacer aqui'
        }
      ));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'encender',
        object: ['candil']
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Eso no se puede hacer aqui');
    });
})

test('Actions intent Forbidden object execution', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      difficulty: { level: 'facil', maxCapacity: 99999 },
      objects:['llave'],
      room: { 'cocina': { 'branch': 0, 'step': 3 } }
    } ));

  jest.spyOn(objectsDao, 'addObject')
    .mockImplementation(() => Promise.reject('Object repeated'));

  jest.spyOn(placesDao, 'getPlaceById')
    .mockImplementation(() =>  Promise.resolve( 
      {
          step: 3, 
          branch: 0,
          description: 'En la antigua y acogedora cocina, desnuda de todo lo que pueda recordar olorosas comidas, queda una triste alacena y, al fondo, una despensa',
          actions: [
            {   
              action: 'coger',
              object: 'llave',
              successResponse: 'Guardala bien, nunca se sabe'
            }
          ],
          genericFailResponse: 'Eso no se puede hacer aqui'
        }
      ));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'coger',
        object: ['candil']
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Eso no se puede hacer aqui');
    });
})

test('Actions intent Forbidden action execution', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      difficulty: { level: 'facil', maxCapacity: 99999 },
      objects:['llave'],
      room: { 'cocina': { 'branch': 0, 'step': 3 } }
    } ));

  jest.spyOn(objectsDao, 'addObject')
    .mockImplementation(() => Promise.reject('Object repeated'));

  jest.spyOn(placesDao, 'getPlaceById')
    .mockImplementation(() =>  Promise.resolve( 
      {
          step: 3, 
          branch: 0,
          description: 'En la antigua y acogedora cocina, desnuda de todo lo que pueda recordar olorosas comidas, queda una triste alacena y, al fondo, una despensa',
          actions: [
            {   
              action: 'coger',
              object: 'llave',
              successResponse: 'Guardala bien, nunca se sabe'
            }
          ],
          genericFailResponse: 'Eso no se puede hacer aqui'
        }
      ));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'ocultar',
        object: ['llave']
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Eso no se puede hacer aqui');
    });
})

test('Actions intent with empty inventory', () => {
  jest.spyOn(usersDao, 'getUserById')
    .mockImplementation(() =>  Promise.resolve( 
    { 
      userName: 'victorman',
      difficulty: { level: 'facil', maxCapacity: 99999 },
      room: { 'biblioteca': { 'branch': 0, 'step': 0 } }
    } ));

  jest.spyOn(statesDao, 'addStatus')
    .mockImplementation(() => Promise.resolve(true));

  jest.spyOn(placesDao, 'getPlaceById')
    .mockImplementation(() =>  Promise.resolve( 
      { 
        step: 0, 
        branch: 0,
        description: "Los libros polvorientos destacan en una estantería situada hacia la izquierda. De todos ellos hay un libro que te llama especialmente la atención",
        actions: [
          {   
            action: "leer",
            object: { name: "libro" },
            successResponse: "Lees en voz alta para espantar el miedo que te recorre el cuerpo. Con cada palabra, todo a tu alrededor vibra cada vez más, hasta que aparece ante ti una ventana etérea, circular, a través de la cual se puede observar una habitación"
          }
        ]
      }
      ));

  return handleRequest({
      intent: 'Acciones',
      payload: {
        user: 'victorman',
        action: 'leer',
        object: ['libro']
      }
    })
    .then(response => {
      expect(response.status).toBe(200);
      expect(response.body.join('')).toMatch('Lees en voz alta para espantar el miedo que te recorre el cuerpo. Con cada palabra, todo a tu alrededor vibra cada vez más, hasta que aparece ante ti una ventana etérea, circular, a través de la cual se puede observar una *habitación*');
    });
})
