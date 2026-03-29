const userRepository = require('../repositories/user.repository');

const getUserState = async (uuid) => {

    const userData = await userRepository.getUserById(uuid);

    // Si el usuario no existe (fue borrado tras game over), devolver estado vacío
    if (!userData || Object.keys(userData).length === 0) {
        return null;
    }

    const objectList = userData.objects || [];

    const currentWeight = objectList.reduce((acc, object) => acc + (object.weight || 0), 0);

    return {
        difficulty: userData.difficulty && userData.difficulty.level,
        maxWeight: userData.difficulty && userData.difficulty.maxCapacity,
        currentWeight,
        energy: userData.hungry,
        objects: objectList,
        placesKnown: userData.placesKnown,
        currentRoom: userData.currentRoom,
        name: userData.userName
    };
};

const saveUserDataService = async ({id, userName, level}) => {
    try {
        await userRepository.addUser(id, userName, level, { lat: 39.5137458, lng: -3.0046506 });
        return;
    } catch (err) {
        console.log('error on save user: ', err);
        throw new Error('error on save user')
    }
}


module.exports = {
    getUserState,
    saveUserDataService
}