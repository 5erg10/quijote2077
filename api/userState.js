const userService = require('../functions/dao/users').getUserById;

const getUserState = (uuid) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userData = await userService(uuid);
            if (!userData.userName) return reject();
            const objectList = Object.values(userData.objectsList).reduce((acc, object) => {
                if(object.jointToSuccess) acc.push(object);
                return acc;
            }, []);
            const currentWeight = objectList.reduce((acc, object) => {
                acc += object.weight;
                return acc;
            }, 0)
            return resolve({
                difficulty: userData.difficulty.level,
                maxWeight: userData.difficulty.maxCapacity,
                currentWeight,
                energy: userData.hungry,
                objects: objectList,
                placesKnown: userData.placesKnown,
                currentRoom: Object.keys(userData.room),
                name: userData.userName
            });
        } catch (error) {
            return reject(error);
        }
    })

}

module.exports = (req, res) => {
    const { uuid } = req.query;
    getUserState(uuid).then(response => {
        console.log('user response: ', response);
        res.send(response);
    }).catch(error => console.log(error));
}