/**
 * authorName 문자열을 해시하여 팔레트 색상을 반환한다.
 * 동일 이름은 항상 동일 색상을 반환하므로 deterministic하다.
 */

const PALETTE = [
  '#3788d8', // blue
  '#e67c32', // orange
  '#2ecc71', // green
  '#9b59b6', // purple
  '#e74c3c', // red
  '#1abc9c', // teal
  '#f39c12', // yellow-orange
  '#2980b9', // dark-blue
  '#d35400', // dark-orange
  '#27ae60', // dark-green
  '#8e44ad', // dark-purple
  '#c0392b', // dark-red
];

/**
 * djb2 해시 함수
 * @param {string} str
 * @returns {number}
 */
function hash(str) {
  if (!str) return 0;
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // uint32
  }
  return h;
}

/**
 * 이름을 받아 팔레트 색상 문자열(hex)을 반환한다.
 * @param {string} name
 * @returns {string}
 */
export function colorForName(name) {
  if (!name) return PALETTE[0];
  const idx = hash(name) % PALETTE.length;
  return PALETTE[idx];
}
