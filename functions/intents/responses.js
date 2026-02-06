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
        const context = agent.context.get('welcome')?.name;
        if (context == 'welcome') {
            agent.add("Pues ya lo siento que no quieras jugar.");
        } else {
            agent.add("No que?");
        }
        return Promise.resolve();
    };
};

module.exports = { 
    afirmative,
    negative
};