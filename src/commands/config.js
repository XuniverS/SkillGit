'use strict';

const chalk = require('chalk');
const Repository = require('../lib/repository');
const logger = require('../utils/logger');

async function cmdConfig(action, key, value, options) {
  const repo = Repository.requireRepo();

  if (action === 'list' || (!action && !key)) {
    const config = await repo.getConfig();
    logger.title('Repository Configuration:');
    logger.separator();
    printObj(config, '');
    return;
  }

  if (action === 'get' || (!value && key)) {
    const k = action === 'get' ? key : action;
    const v = await repo.getConfigValue(k);
    if (v === undefined) {
      logger.warn(`Key '${k}' not found`);
    } else {
      logger.plain(`${k} = ${chalk.green(v)}`);
    }
    return;
  }

  if (action === 'set') {
    await repo.setConfig(key, value);
    logger.success(`Set ${key} = ${value}`);
    return;
  }

  // 解析 `ski config user.name "Alice"` 格式
  if (action && key && !value) {
    await repo.setConfig(action, key);
    logger.success(`Set ${action} = ${key}`);
    return;
  }

  logger.error('Usage: ski config [list|get <key>|set <key> <value>]');
}

function printObj(obj, prefix) {
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      printObj(v, fullKey);
    } else {
      const displayVal = fullKey.toLowerCase().includes('key') ? chalk.dim('*'.repeat(8)) : chalk.green(String(v));
      console.log(`  ${chalk.cyan(fullKey)} = ${displayVal}`);
    }
  }
}

async function cmdRemote(action, name, url) {
  const repo = Repository.requireRepo();

  if (action === 'set-url') {
    const remoteName = name || 'origin';
    await repo.setConfig(`remote.${remoteName}`, url);
    logger.success(`Remote '${remoteName}' set to: ${url}`);
    return;
  }

  if (action === 'get-url') {
    const remoteName = name || 'origin';
    const remoteUrl = await repo.getConfigValue(`remote.${remoteName}`);
    if (!remoteUrl) {
      logger.warn(`Remote '${remoteName}' not configured`);
    } else {
      logger.plain(`${remoteName}\t${chalk.cyan(remoteUrl)}`);
    }
    return;
  }

  if (!action || action === 'list' || action === '-v') {
    const config = await repo.getConfig();
    const remotes = config.remote || {};
    if (Object.keys(remotes).length === 0) {
      logger.warn('No remotes configured');
    } else {
      for (const [rName, rUrl] of Object.entries(remotes)) {
        if (rUrl) {
          logger.plain(`${chalk.cyan(rName)}\t${rUrl}`);
        }
      }
    }
    return;
  }

  logger.error('Usage: ski remote [set-url <name> <url> | get-url <name> | list]');
}

module.exports = { cmdConfig, cmdRemote };
