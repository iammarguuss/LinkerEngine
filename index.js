// index.js
// Демонстрация всех методов MyShortener:
// - addLink
// - getLongLink
// - removeLink
// - updateLink
// - listAllLinks
//
// Допустим, myshortener.js лежит рядом в той же папке.

const MyShortener = require('./myshortener');

// Создаём экземпляр класса
// (Если не передаём existingApp, внутри конструктора создастся свой express())
const shortener = new MyShortener({
  port: 3000,
  dataDir: './data',
  fileName: 'links.json',
  publicDir: './public',        // Если хотим отдавать index.html и т.п.
  allowedDomain: null,          // Если хотим разрешать любые ссылки, ставим null
  basePath: '/share',           // короткие ссылки будут /share/:shortId
  addLinkRoute: '/api/addLink', // POST для добавления ссылок
  addLinkField: 'longLink',     // Поле, из которого берем URL
  autoListen: false             // Не запускаем app.listen внутри класса автоматически
});

// Получаем доступ к тому же экземпляру express(), что хранится в shortener.app
// (Внутри MyShortener, если existingApp=null, создаётся this.app = express())
const app = shortener.app;

// --------------------------
// Демонстрационные роуты
// --------------------------

/**
 * GET /demoAdd?url=...
 * Пример: /demoAdd?url=http://localhost:3000/page1
 * Вызывает shortener.addLink(url), возвращает shortId
 */
app.get('/demoAdd', (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('Please provide ?url=');
  }
  try {
    const shortId = shortener.addLink(url);
    res.send(`Added link "${url}", shortId = "${shortId}"`);
  } catch (error) {
    res.status(400).send(`Error: ${error.message}`);
  }
});

/**
 * GET /demoGet?shortId=xxx
 * Пример: /demoGet?shortId=abc123
 * Вызывает shortener.getLongLink(shortId), возвращает исходную ссылку
 */
app.get('/demoGet', (req, res) => {
  const { shortId } = req.query;
  if (!shortId) {
    return res.status(400).send('Please provide ?shortId=');
  }
  const longLink = shortener.getLongLink(shortId);
  if (!longLink) {
    return res.send(`No link found for shortId="${shortId}"`);
  }
  res.send(`shortId="${shortId}" -> ${longLink}`);
});

/**
 * GET /demoRemove?shortId=xxx
 * Пример: /demoRemove?shortId=abc123
 * Вызывает shortener.removeLink(shortId), удаляет ссылку
 */
app.get('/demoRemove', (req, res) => {
  const { shortId } = req.query;
  if (!shortId) {
    return res.status(400).send('Please provide ?shortId=');
  }
  const removed = shortener.removeLink(shortId);
  if (removed) {
    res.send(`Removed shortId="${shortId}" from storage.`);
  } else {
    res.send(`No link to remove. shortId="${shortId}" not found.`);
  }
});

/**
 * GET /demoUpdate?shortId=xxx&newLink=...
 * Пример: /demoUpdate?shortId=abc123&newLink=http://localhost:3000/updated
 * Вызывает shortener.updateLink(shortId, newLink)
 */
app.get('/demoUpdate', (req, res) => {
  const { shortId, newLink } = req.query;
  if (!shortId || !newLink) {
    return res.status(400).send('Please provide ?shortId= and ?newLink=');
  }
  try {
    const updated = shortener.updateLink(shortId, newLink);
    if (updated) {
      res.send(`Updated shortId="${shortId}" => "${newLink}"`);
    } else {
      res.send(`shortId="${shortId}" not found. Nothing updated.`);
    }
  } catch (error) {
    res.status(400).send(`Error: ${error.message}`);
  }
});

/**
 * GET /demoList
 * Возвращает JSON со всеми короткими ссылками
 */
app.get('/demoList', (req, res) => {
  const allLinks = shortener.listAllLinks();
  res.json(allLinks);
});

// --------------------------
// Запускаем сервер
// --------------------------

app.listen(3000, () => {
  console.log('Demo server listening on port 3000!');
  console.log('Try accessing:');
  console.log('  http://localhost:3000/demoAdd?url=http://localhost:3000/test');
  console.log('  http://localhost:3000/demoGet?shortId=xxxxx');
  console.log('  http://localhost:3000/demoRemove?shortId=xxxxx');
  console.log('  http://localhost:3000/demoUpdate?shortId=xxxxx&newLink=...');
  console.log('  http://localhost:3000/demoList');
});
