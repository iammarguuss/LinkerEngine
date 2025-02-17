// index.js
// Запуск приложения на Express.
// 1. Отдаём статические файлы из /public
// 2. POST /api/addLink - добавляем ссылку
// 3. GET /share/:shortId - редирект

const express = require('express');
const path = require('path');
const OwnLink = require('./ownlink');

const app = express();

// Инициализируем класс OwnLink
// В allowedDomain укажем 'localhost:3000', чтобы сокращать только ссылки на localhost:3000
// Если не нужно ограничение домена, можно поставить null
const shortener = new OwnLink({
  dataDir: './data',
  fileName: 'links.json',
  allowedDomain: 'localhost:3000' 
});

// Парсим JSON-тело
app.use(express.json());

// Отдаём папку public как статическую
// Это нужно, чтобы http://localhost:3000/index.html открылось нормально
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/addLink
// Ожидает в body JSON: { "longLink": "http://localhost:3000/any-page" }
app.post('/api/addLink', (req, res) => {
  try {
    const { longLink } = req.body;
    if (!longLink) {
      return res.status(400).json({ success: false, error: 'longLink is required' });
    }

    // Добавляем ссылку
    const shortId = shortener.addLink(longLink);

    // Формируем финальный короткий URL вида http://localhost:3000/share/xxx
    const shortUrl = `http://localhost:3000/share/${shortId}`;

    return res.json({
      success: true,
      shortId,
      shortUrl
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// GET /share/:shortId
// Редиректим на исходную ссылку, если она есть
app.get('/share/:shortId', (req, res) => {
  const shortId = req.params.shortId;
  const longLink = shortener.getLongLink(shortId);

  if (longLink) {
    // 301 или 302
    return res.redirect(301, longLink);
  } else {
    return res.status(404).send('Short link not found');
  }
});

// Запускаем сервер
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
