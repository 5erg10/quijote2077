const placesData = require('../../data/places.json');
const { getUserState, saveUserDataService } = require('../services/user.service');

const getUserData = async (req, res) => {
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

const saveUserData = async (req, res) => {
  try {
    const { id, userName, level } = req.body;
    await saveUserDataService({ id, userName, level });
    res.status(200).send('user saved!');
  } catch (err) {
    console.log('eror: ', err);
    res.status(400).send('error on user saved');
  }
}

module.exports = { getUserData, handlePlaces, saveUserData };
