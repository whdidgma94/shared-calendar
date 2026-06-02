'use strict';

/**
 * nanoid v3 (CommonJS 호환) — 22자 URL-safe 토큰 생성
 *
 * nanoid v4 이상은 ESM-only이므로 package.json에는 "nanoid": "^3.3.7" 고정.
 */
const { nanoid } = require('nanoid');

/**
 * 22자 URL-safe 무작위 토큰 생성
 * @returns {string}
 */
function generateToken() {
  return nanoid(22);
}

module.exports = { generateToken };
