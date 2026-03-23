const userService = require('../repositories/user.repository').getUserById;
const placesData = require('../../data/places.json');

const getUserState = async (uuid) => {
  const userData = await userService(uuid);

  // Si el usuario no existe (fue borrado tras game over), devolver estado vacío
  if (!userData || Object.keys(userData).length === 0) {
    return null;
  }

  const objectList = userData.objectsList
    ? Object.values(userData.objectsList).reduce((acc, object) => {
        if (object.jointToSuccess) acc.push(object);
        return acc;
      }, [])
    : [];

  const currentWeight = objectList.reduce((acc, object) => acc + (object.weight || 0), 0);

  return {
    difficulty: userData.difficulty && userData.difficulty.level,
    maxWeight: userData.difficulty && userData.difficulty.maxCapacity,
    currentWeight,
    energy: userData.hungry,
    objects: objectList,
    placesKnown: userData.placesKnown,
    currentRoom: userData.room ? Object.keys(userData.room) : [],
    name: userData.userName
  };
};

const handleUserState = async (req, res) => {
  const { uuid } = req.query;
  try {
    const response = await getUserState(uuid);
    // Si el usuario no existe, devolver 204 (sin contenido) para que
    // el frontend sepa que no hay estado que mostrar sin lanzar un error
    if (!response) {
      return res.status(204).send();
    }
    res.json(response);
  } catch (error) {
    console.error('userState error:', error);
    res.status(500).json({ error: 'Error obteniendo estado del usuario' });
  }
};

const handlePlaces = (req, res) => {
  res.json(placesData);
};

module.exports = { handleUserState, handlePlaces };
