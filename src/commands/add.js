'use strict';

const path = require('path');
const Repository = require('../lib/repository');
const logger = require('../utils/logger');

async function cmdAdd(targets, options) {
  const repo = Repository.requireRepo();

  if (!targets || targets.length === 0 || targets[0] === '.') {
    // 添加全部
    const staged = await repo.stageAll();
    if (staged.length === 0) {
      logger.warn('No skills found. Make sure your skills contain a SKILL.md file.');
      return;
    }
    for (const s of staged) {
      logger.skillAdded(s);
    }
    logger.success(`Staged ${staged.length} skill(s)`);
    return;
  }

  // 添加指定 skill
  const stagedList = [];
  for (const target of targets) {
    try {
      const skillName = await repo.stageSkill(target);
      stagedList.push(skillName);
      logger.skillAdded(skillName);
    } catch (err) {
      logger.error(`Failed to stage '${target}': ${err.message}`);
    }
  }

  if (stagedList.length > 0) {
    logger.success(`Staged ${stagedList.length} skill(s)`);
  }
}

module.exports = cmdAdd;
