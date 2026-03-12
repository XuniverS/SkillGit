'use strict';

const chalk = require('chalk');
const Repository = require('../lib/repository');
const logger = require('../utils/logger');

async function cmdLog(options) {
  const repo = Repository.requireRepo();
  const branch = await repo.getCurrentBranch();
  const logs = await repo.getLog();

  if (logs.length === 0) {
    logger.warn(`No commits on branch '${branch}' yet.`);
    return;
  }

  const limit = options.n ? parseInt(options.n, 10) : logs.length;
  const entries = logs.slice(0, limit);

  logger.title(`\nCommit history on branch: ${chalk.cyan(branch)}`);
  logger.separator();

  for (const entry of entries) {
    const shortId = (entry.commitId || '').substring(0, 12);
    console.log(
      `${chalk.yellow('commit')} ${chalk.yellow(entry.commitId || '')}`
    );
    console.log(`Author: ${chalk.bold(entry.author || 'unknown')} <${entry.email || ''}>`);
    console.log(`Date:   ${entry.timestamp || ''}`);
    console.log('');
    console.log(`    ${entry.message || ''}`);
    console.log('');
    logger.separator();
  }
}

module.exports = cmdLog;
