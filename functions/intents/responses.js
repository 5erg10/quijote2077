function afirmative(request) {
    return agent => {
        const context = agent.context.get('welcome')?.name;
        if (context == 'welcome') {
            agent.add("...");
            agent.setFollowupEvent('REDIRECT_GUARDAR_NOMBRE');
        } else {
            agent.add("No estoy seguro de a qué te refieres.");
        }
        return Promise.resolve();
    };
};

function negative(request) {
    return agent => {
        const message = `Pues ya siento que me digas que no`;
        agent.add(message);
        return Promise.resolve();
    };
};

module.exports = { 
    afirmative,
    negative
};