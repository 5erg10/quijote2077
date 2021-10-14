const contextDao = require('../dao/context');
const usersDao = require('../dao/users');
const { isNight } = require('../utils/time');

function recoverUserName(request) {
    return agent => {
        const userAccount = contextDao.getUserId(request);
        return usersDao.getUserById(userAccount).then(user => {
          if (user) {
            // agent.add(new Card({
            //     title: `Que memoria la tuya, tu nombre es ${user.userName}.`,
            //     imageUrl: imageUrl,
            //     text: isNight(user) ? 'Hace una noche despejada.' : 'Hace un día estupendo.',
            //     buttonText: '?',
            //     buttonUrl: 'https://assistant.google.com/'
            //   })
            // );
            agent.add(`Que memoria la tuya, tu nombre es ${user.userName}.`);
            agent.add(isNight(user) ? 'Hace una noche despejada.' : 'Hace un día estupendo.');
          }
        });
    }
}

module.exports = { recoverUserName };
