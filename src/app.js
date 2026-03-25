const express = require('express');
const path = require('path');

const gameRoutes = require('./routes/game.routes');
const userRoutes = require('./routes/user.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => res.redirect('/index.html'));

app.use(gameRoutes);
app.use(userRoutes);

app.use(errorHandler);

module.exports = app;
