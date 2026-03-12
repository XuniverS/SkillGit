'use strict';

const chalk = require('chalk');
const { createTwoFilesPatch } = require('diff');
const Repository = require('../lib/repository');
const logger = require('../utils/logger');

async function cmdDiff(skillName, options) {
  const repo = Repository.requireRepo();

  let skills = [];
  if (skillName) {
    skills = [skillName];
  } else {
    const status = await repo.getStatus();
    skills = [
      ...status.unstaged.map((s) => s.name),
      ...status.staged.map((s) => s.name),
    ];
  }

  if (skills.length === 0) {
    logger.success('No changes to show.');
    return;
  }

  for (const s of skills) {
    let diffs;
    try {
      diffs = await repo.getDiff(s);
    } catch (err) {
      logger.warn(`Skipping '${s}': ${err.message}`);
      continue;
    }

    if (Object.keys(diffs).length === 0) {
      logger.dim(`No changes in skill: ${s}`);
      continue;
    }

    console.log(chalk.bold.blue(`\ndiff --ski a/${s} b/${s}`));
    logger.separator();

    for (const [file, { original, current }] of Object.entries(diffs)) {
      const patch = createTwoFilesPatch(
        `a/${s}/${file}`,
        `b/${s}/${file}`,
        original,
        current,
        '',
        '',
        { context: 3 }
      );

      const lines = patch.split('\n');
      for (const line of lines) {
        if (line.startsWith('---') || line.startsWith('+++')) {
          console.log(chalk.bold(line));
        } else if (line.startsWith('@@')) {
          console.log(chalk.cyan(line));
        } else if (line.startsWith('+')) {
          console.log(chalk.green(line));
        } else if (line.startsWith('-')) {
          console.log(chalk.red(line));
        } else {
          console.log(line);
        }
      }
    }
  }
}

module.exports = cmdDiff;
