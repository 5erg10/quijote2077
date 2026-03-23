require('dotenv').config();
const app = require('./src/app');
const port = process.env.PORT || 4500;

app.listen(port, () => console.log(`Quijote 2077 server running at port ${port}`));
