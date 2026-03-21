const userService = require('../functions/dao/users').getUserById;

const getUserState = async (uuid) => {
  const userData = await userService(uuid);
  const objectList = Object.values(userData.objectsList).reduce((acc, object) => {
    if (object.jointToSuccess) acc.push(object);
    return acc;
  }, []);
  const currentWeight = objectList.reduce((acc, object) => acc + (object.weight || 0), 0);

  return {
    difficulty: userData.difficulty && userData.difficulty.level,
    maxWeight: userData.difficulty && userData.difficulty.maxCapacity,
    currentWeight,
    energy: userData.hungry,
    objects: objectList,
    placesKnown: userData.placesKnown,
    currentRoom: Object.keys(userData.room),
    name: userData.userName
  };
};

module.exports = async (req, res) => {
  const { uuid } = req.query;
  try {
    const response = await getUserState(uuid);
    res.json(response);
  } catch (error) {
    console.error('userState error:', error);
    res.status(500).json({ error: 'Error obteniendo estado del usuario' });
  }
};
