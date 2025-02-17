// index.js
const MyShortener = require('./myshortener');

const shortener = new MyShortener({
  port: 3000,
  publicDir: './public',          // если хотим отдавать index.html и т.п.
  dataDir: './data',
  fileName: 'links.json',
  basePath: '/share',
  addLinkRoute: '/api/addLink',
  addLinkField: 'longLink',
  allowedDomain: 'localhost:3000', // или null, если не надо ограничений
  autoListen: true                 // сервер запустится сам
});

shortener.start(); // => Запустит сервер на порту 3000
