// Entry point: opens the database file and starts the web server.
const path = require('node:path');
const { openDatabase } = require('./src/db');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'smartstock.db');

const db = openDatabase(DB_FILE);
const app = createApp(db);

app.listen(PORT, () => {
  console.log('Smart Stock is running at http://localhost:' + PORT);
});
