// userServer.js
const express = require('express');
const MyShortener = require('./myshortener');

const app = express();
app.use(express.json());

// Собственные роуты
app.get('/hello', (req, res) => {
  res.send('Hello from main app!');
});

// Создаём экземпляр, передаём existingApp
const shortener = new MyShortener({
  existingApp: app,
  publicDir: './public',
  dataDir: './data',
  basePath: '/share',
  addLinkRoute: '/api/addLink',
  autoListen: false // раз мы хотим сами запускать
});

// Интегрируем (по сути, всё уже готово, но для наглядности)
shortener.integrate();

// Запускаем сервер на 4000
app.listen(4000, () => {
  console.log('Main server is up on port 4000');
});
