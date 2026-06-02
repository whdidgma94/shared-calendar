'use strict';

const Database = require('better-sqlite3');
const path = require('path');

// DB_PATH 환경변수 우선 (Railway 볼륨: /data/app.db), 미지정 시 프로젝트 루트 app.db
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../../app.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
