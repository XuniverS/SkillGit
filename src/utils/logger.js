'use strict';

const chalk = require('chalk');

const logger = {
  info(msg) {
    console.log(chalk.cyan('ℹ'), msg);
  },
  success(msg) {
    console.log(chalk.green('✔'), msg);
  },
  warn(msg) {
    console.log(chalk.yellow('⚠'), msg);
  },
  error(msg) {
    console.error(chalk.red('✖'), msg);
  },
  title(msg) {
    console.log(chalk.bold.blue(msg));
  },
  plain(msg) {
    console.log(msg);
  },
  dim(msg) {
    console.log(chalk.dim(msg));
  },
  skillAdded(skill) {
    console.log(chalk.green('  + ') + chalk.white(skill));
  },
  skillModified(skill) {
    console.log(chalk.yellow('  ~ ') + chalk.white(skill));
  },
  skillDeleted(skill) {
    console.log(chalk.red('  - ') + chalk.white(skill));
  },
  skillConflict(skill) {
    console.log(chalk.red('  ! ') + chalk.bold.red(skill) + chalk.red(' [CONFLICT]'));
  },
  separator() {
    console.log(chalk.dim('─'.repeat(60)));
  },
};

module.exports = logger;
