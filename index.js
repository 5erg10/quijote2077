require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 4500;

app.use(express.json());
app.use(express.static('web'));

app.get('/', (req, res) => res.redirect('/index.html'));

// Estado del usuario
app.get('/userstate', require('./api/userState'));

// Endpoint principal del juego - reemplaza /api/intent + /webhook
app.post('/api/game', require('./api/game'));

app.listen(port, () => console.log(`Quijote 2077 server running at port ${port}`));
