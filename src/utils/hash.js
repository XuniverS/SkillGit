'use strict';

const crypto = require('crypto');

/**
 * 计算内容的 SHA256 哈希值（短 12 位）
 */
function hashContent(content) {
  return crypto
    .createHash('sha256')
    .update(typeof content === 'string' ? content : JSON.stringify(content))
    .digest('hex')
    .substring(0, 12);
}

/**
 * 计算完整 SHA256
 */
function hashFull(content) {
  return crypto
    .createHash('sha256')
    .update(typeof content === 'string' ? content : JSON.stringify(content))
    .digest('hex');
}

/**
 * 生成唯一 commit ID
 */
function generateCommitId(content, timestamp) {
  return crypto
    .createHash('sha256')
    .update(`${content}${timestamp}${Math.random()}`)
    .digest('hex')
    .substring(0, 40);
}

module.exports = { hashContent, hashFull, generateCommitId };
