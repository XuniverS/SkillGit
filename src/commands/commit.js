'use strict';

const chalk = require('chalk');
const { prompt } = require('enquirer');
const Repository = require('../lib/repository');
const logger = require('../utils/logger');

async function cmdCommit(options) {
  const repo = Repository.requireRepo();

  let message = options.message || options.m;

  if (!message) {
    const answer = await prompt({
      type: 'input',
      name: 'message',
      message: 'Commit message:',
    });
    message = answer.message;
  }

  if (!message || !message.trim()) {
    logger.error('Abort: empty commit message');
    process.exit(1);
  }

  const index = await repo.getIndex();
  if (Object.keys(index.staged).length === 0) {
    logger.warn('Nothing to commit. Use `skl add <skill>` to stage changes first.');
    return;
  }

  const config = await repo.getConfig();

  const commitObj = await repo.commit(message.trim(), {
    author: config.user.name,
    email: config.user.email,
  });

  const shortId = commitObj.id.substring(0, 12);
  const skillCount = Object.keys(commitObj.skills).length;

  logger.success(`[${chalk.cyan(shortId)}] ${message.trim()}`);
  logger.info(`${skillCount} skill(s) committed by ${chalk.bold(commitObj.author || 'unknown')}`);
  logger.dim(`Timestamp: ${commitObj.timestamp}`);
}

module.exports = cmdCommit;
