// ownlink.js
// Класс OwnLink для хранения/генерации коротких ссылок в файле.
// Дополнительно: проверяем домен, если хотим ограничиться только своим доменом.

const fs = require('fs');
const path = require('path');

class OwnLink {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir='./data'] - Папка, где лежит JSON-файл
   * @param {string} [options.fileName='links.json'] - Название JSON-файла
   * @param {string|null} [options.allowedDomain=null] - Если не null, проверяем host у ссылки (например 'localhost:3000')
   */
  constructor({
    dataDir = './data',
    fileName = 'links.json',
    allowedDomain = null
  } = {}) {
    this.dataDir = dataDir;
    this.fileName = fileName;
    this.allowedDomain = allowedDomain; // может быть null, тогда не проверяем

    // Путь к файлу
    this.filePath = path.join(this.dataDir, this.fileName);

    // Создаем директорию, если не существует
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Создаем пустой JSON, если файла нет
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({}));
    }

    // Загружаем ссылки в объект
    const fileData = fs.readFileSync(this.filePath, 'utf-8');
    this.linksMap = JSON.parse(fileData); // объект вида { shortId: longLink, ... }
  }

  /**
   * Добавить новую длинную ссылку в хранилище. Вернёт shortId.
   * Если указано allowedDomain, проверяем, что ссылка принадлежит этому домену.
   * @param {string} longLink
   * @returns {string} shortId
   */
  addLink(longLink) {
    if (!longLink) {
      throw new Error('longLink is required');
    }

    // Если allowedDomain задан, проверяем домен
    if (this.allowedDomain) {
      const urlObj = new URL(longLink);
      if (urlObj.host !== this.allowedDomain) {
        throw new Error(`Link must be from domain "${this.allowedDomain}". Получено: ${urlObj.host}`);
      }
    }

    // Генерируем shortId
    let shortId;
    do {
      shortId = Math.random().toString(36).substr(2, 6); // 6 символов
    } while (this.linksMap[shortId]);

    // Сохраняем
    this.linksMap[shortId] = longLink;
    this._save();

    return shortId;
  }

  /**
   * Получить длинную ссылку по shortId. Вернёт undefined, если нет.
   * @param {string} shortId
   * @returns {string|undefined}
   */
  getLongLink(shortId) {
    return this.linksMap[shortId];
  }

  /**
   * Приватный метод: сохранить все ссылки в файл
   */
  _save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.linksMap, null, 2));
  }
}

module.exports = OwnLink;
