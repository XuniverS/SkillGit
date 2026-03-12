'use strict';

const chalk = require('chalk');
const Repository = require('../lib/repository');
const logger = require('../utils/logger');

async function cmdStatus(options) {
  const repo = Repository.requireRepo();
  const branch = await repo.getCurrentBranch();
  const commitId = await repo.getCurrentCommitId();
  const status = await repo.getStatus();

  logger.title(`On branch ${chalk.cyan(branch)}`);
  if (commitId) {
    logger.dim(`HEAD: ${commitId.substring(0, 12)}`);
  } else {
    logger.dim('No commits yet');
  }
  logger.separator();

  const hasChanges =
    status.staged.length > 0 ||
    status.unstaged.length > 0 ||
    status.untracked.length > 0 ||
    status.deleted.length > 0;

  if (!hasChanges) {
    logger.success('Nothing to commit, working tree clean');
    return;
  }

  if (status.staged.length > 0) {
    console.log(chalk.green.bold('\nChanges to be committed:'));
    console.log(chalk.dim('  (use "skl restore --staged <skill>" to unstage)'));
    for (const s of status.staged) {
      console.log(`  ${chalk.green('staged:   ')} ${s.name}`);
    }
  }

  if (status.unstaged.length > 0) {
    console.log(chalk.yellow.bold('\nChanges not staged for commit:'));
    console.log(chalk.dim('  (use "skl add <skill>" to update what will be committed)'));
    for (const s of status.unstaged) {
      console.log(`  ${chalk.yellow('modified: ')} ${s.name}`);
    }
  }

  if (status.deleted.length > 0) {
    console.log(chalk.red.bold('\nDeleted skills:'));
    for (const s of status.deleted) {
      console.log(`  ${chalk.red('deleted:  ')} ${s.name}`);
    }
  }

  if (status.untracked.length > 0) {
    console.log(chalk.dim('\nUntracked skills:'));
    console.log(chalk.dim('  (use "skl add <skill>" to include in what will be committed)'));
    for (const s of status.untracked) {
      console.log(`  ${chalk.dim('untracked:')} ${s.name}`);
    }
  }

  console.log('');
}

module.exports = cmdStatus;
