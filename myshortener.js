/**
 * myshortener.js
 *
 * Гибкая библиотека для сокращения ссылок.
 *
 * ОСНОВНЫЕ ВОЗМОЖНОСТИ:
 * - Хранение ссылок shortId -> longLink в JSON-файле.
 * - При вызове start() может автоматически поднять Express-сервер.
 * - Может встроиться в уже существующий Express (через existingApp).
 * - Позволяет настроить маршруты, папку для статики, имя поля в POST-запросе и т.п.
 * - Имеет публичные методы для управления ссылками: addLink, getLongLink, removeLink, updateLink, listAllLinks.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');

class MyShortener {
  /**
   * @param {Object} config
   * @param {number}   [config.port=3000] - Порт для собственного сервера
   * @param {string}   [config.dataDir='./data'] - Папка для JSON-файла
   * @param {string}   [config.fileName='links.json'] - Имя JSON-файла
   * @param {string|null}  [config.publicDir=null] - Папка для статики (index.html и пр.)
   * @param {string|null}  [config.allowedDomain=null] - Если не null, разрешаем только ссылки на указанный домен (host)
   * @param {string}   [config.basePath='/share'] - Префикс для коротких ссылок, напр. '/share'
   * @param {string}   [config.addLinkRoute='/api/addLink'] - Роут для POST-запроса добавления ссылки
   * @param {string}   [config.addLinkField='longLink'] - Название поля в body для URL
   * @param {boolean}  [config.autoListen=true] - Если true, при start() вызывается app.listen(port)
   * @param {object|null}  [config.existingApp=null] - Если передать готовый Express, встроим роуты в него
   */
  constructor({
    port = 3000,
    dataDir = './data',
    fileName = 'links.json',
    publicDir = null,
    allowedDomain = null,
    basePath = '/share',
    addLinkRoute = '/api/addLink',
    addLinkField = 'longLink',
    autoListen = true,
    existingApp = null
  } = {}) {
    // Запоминаем конфиг
    this.port = port;
    this.dataDir = dataDir;
    this.fileName = fileName;
    this.publicDir = publicDir;
    this.allowedDomain = allowedDomain;
    this.basePath = basePath;
    this.addLinkRoute = addLinkRoute;
    this.addLinkField = addLinkField;
    this.autoListen = autoListen;
    this.existingApp = existingApp;

    // Путь к файлу JSON
    this.filePath = path.join(this.dataDir, this.fileName);

    // Объект (или Map) для ссылок { shortId: longLink, ... }
    this.linksMap = {};

    // Инициализируем хранилище
    this._initStorage();

    // Если не передан existingApp, создаём свой экземпляр Express
    this.app = existingApp || express();

    // Если мы сами создали app, нужно добавить JSON-парсер
    if (!existingApp) {
      this.app.use(express.json());
    }

    // Настраиваем роуты
    this._setupRoutes();
  }

  /**
   * Запускает встроенный сервер, если нет existingApp и autoListen=true.
   * Если есть existingApp, выводит сообщение, что нужно самостоятельно запускать app.listen().
   */
  start() {
    if (this.existingApp) {
      console.log('MyShortener integrated with existing Express app. Start your server manually.');
      return;
    }
    if (!this.autoListen) {
      console.log('autoListen = false. You must call app.listen(...) manually.');
      return;
    }

    // Запускаем свой сервер
    this.app.listen(this.port, () => {
      console.log(`MyShortener server running on http://localhost:${this.port}`);
      if (this.publicDir) {
        console.log(`Serving static from: "${this.publicDir}"`);
      }
      console.log(`Short link route: ${this.basePath}/:shortId`);
      console.log(`Add link route: ${this.addLinkRoute} (POST field: "${this.addLinkField}")`);
    });
  }

  /**
   * Если хотим явно встроить роуты в уже существующий сервер,
   * вызываем этот метод. По сути, всё уже сконфигурировано в конструкторе.
   * Можно просто вызывать integrate() для наглядности.
   */
  integrate() {
    console.log('MyShortener integrated. The existing app must be listening somewhere else.');
  }

  // ============================================================================
  // ПУБЛИЧНЫЕ МЕТОДЫ (для прямого использования)
  // ============================================================================

  /**
   * Добавить новую длинную ссылку -> вернуть shortId
   * @param {string} longLink
   * @returns {string} shortId
   */
  addLink(longLink) {
    return this._createShortId(longLink);
  }

  /**
   * Получить исходную ссылку по shortId
   * @param {string} shortId
   * @returns {string|undefined} longLink или undefined, если нет
   */
  getLongLink(shortId) {
    return this.linksMap[shortId];
  }

  /**
   * Удалить ссылку
   * @param {string} shortId
   * @returns {boolean} true, если удалили; false, если не было
   */
  removeLink(shortId) {
    if (this.linksMap[shortId]) {
      delete this.linksMap[shortId];
      this._saveStorage();
      return true;
    }
    return false;
  }

  /**
   * Обновить существующую ссылку
   * @param {string} shortId
   * @param {string} newLongLink
   * @returns {boolean} true, если обновили; false, если не было
   */
  updateLink(shortId, newLongLink) {
    if (!this.linksMap[shortId]) {
      return false;
    }
    // Проверим domain, если нужно
    if (this.allowedDomain) {
      const urlObj = new URL(newLongLink);
      if (urlObj.host !== this.allowedDomain) {
        throw new Error(`Link must be from domain "${this.allowedDomain}". Got: ${urlObj.host}`);
      }
    }
    this.linksMap[shortId] = newLongLink;
    this._saveStorage();
    return true;
  }

  /**
   * Получить объект всех ссылок (shortId -> longLink)
   * @returns {Object} например { abc123: 'http://...', ... }
   */
  listAllLinks() {
    return { ...this.linksMap };
  }

  // ============================================================================
  // ВНУТРЕННИЕ МЕТОДЫ
  // ============================================================================

  /**
   * Инициализация хранилища:
   * - Создаём директорию, если нет.
   * - Создаём файл, если нет.
   * - Загружаем JSON в this.linksMap.
   */
  _initStorage() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '{}');
    }
    const fileData = fs.readFileSync(this.filePath, 'utf-8');
    try {
      this.linksMap = JSON.parse(fileData);
    } catch (err) {
      console.error('Error parsing JSON. Starting with empty data.', err);
      this.linksMap = {};
    }
  }

  /**
   * Сохраняет текущие ссылки в JSON-файл
   */
  _saveStorage() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.linksMap, null, 2));
  }

  /**
   * Настройка маршрутов в this.app:
   * - Статика (если publicDir не null)
   * - POST addLinkRoute -> добавляет ссылку
   * - GET basePath/:shortId -> редирект
   */
  _setupRoutes() {
    // Раздаём статику, если указано
    if (this.publicDir) {
      const absPublicPath = path.isAbsolute(this.publicDir)
        ? this.publicDir
        : path.join(process.cwd(), this.publicDir);
      this.app.use(express.static(absPublicPath));
    }

    // POST /api/addLink (по умолчанию)
    this.app.post(this.addLinkRoute, (req, res) => {
      try {
        const longLink = req.body[this.addLinkField];
        if (!longLink) {
          return res.status(400).json({
            success: false,
            error: `Field "${this.addLinkField}" is required in the request body`
          });
        }
        const shortId = this._createShortId(longLink);
        const shortUrl = `http://localhost:${this.port}${this.basePath}/${shortId}`;
        return res.json({
          success: true,
          shortId,
          shortUrl
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    // GET /basePath/:shortId -> редирект
    this.app.get(`${this.basePath}/:shortId`, (req, res) => {
      const shortId = req.params.shortId;
      const longLink = this.linksMap[shortId];
      if (longLink) {
        return res.redirect(301, longLink);
      }
      return res.status(404).send('Short link not found');
    });
  }

  /**
   * Создать shortId для longLink (с проверкой домена, если задан)
   * @param {string} longLink
   * @returns {string} shortId
   */
  _createShortId(longLink) {
    // Проверяем домен, если указано
    if (this.allowedDomain) {
      const urlObj = new URL(longLink);
      if (urlObj.host !== this.allowedDomain) {
        throw new Error(`Link must be from domain "${this.allowedDomain}". Got: ${urlObj.host}`);
      }
    }

    // Генерируем короткий ID без коллизий
    let shortId;
    do {
      shortId = Math.random().toString(36).substr(2, 6);
    } while (this.linksMap[shortId]);

    // Сохраняем
    this.linksMap[shortId] = longLink;
    this._saveStorage();
    return shortId;
  }
}

module.exports = MyShortener;
