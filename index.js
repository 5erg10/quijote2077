require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 4500;

app.use(express.json());
app.use(express.static('web'));

app.get('/', (req, res) => res.redirect('/index.html'));

// Estado del usuario
app.get('/userstate', require('./api/userState'));

// Endpoint principal del juego
app.post('/api/game', require('./api/game'));

// Descripciones de lugares para el panel de personaje
app.get('/places', (req, res) => {
  res.json(require('./functions/dao/places.json'));
});

app.listen(port, () => console.log(`Quijote 2077 server running at port ${port}`));
