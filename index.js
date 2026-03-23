require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express();
const port = process.env.PORT || 4500;

const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, espera un momento antes de continuar.' },
});

app.use(express.json());
app.use(express.static('web'));

const placesData = require('./gameData/places.json');

app.get('/', (req, res) => res.redirect('/index.html'));

// Estado del usuario
app.get('/userstate', require('./api/userState'));

// Endpoint principal del juego
app.post('/api/game', gameLimiter, require('./api/game'));

// Descripciones de lugares para el panel de personaje
app.get('/places', (req, res) => {
  res.json(placesData);
});

app.listen(port, () => console.log(`Quijote 2077 server running at port ${port}`));
