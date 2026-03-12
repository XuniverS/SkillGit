'use strict';

const chalk = require('chalk');
const { prompt } = require('enquirer');
const Repository = require('../lib/repository');
const logger = require('../utils/logger');

async function cmdInit(options) {
  const cwd = process.cwd();
  const repo = new Repository(cwd);

  const existing = Repository.findRoot(cwd);
  if (existing) {
    logger.warn(`Already initialized at: ${existing}`);
    return;
  }

  let name = options.name || '';
  let email = options.email || '';
  let remote = options.remote || '';
  let openapiKey = options.openapiKey || '';
  let model = options.model || 'gpt-4o';

  if (!options.yes) {
    const answers = await prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Your name:',
        initial: process.env.USER || '',
      },
      {
        type: 'input',
        name: 'email',
        message: 'Your email:',
        initial: '',
      },
      {
        type: 'input',
        name: 'remote',
        message: 'Remote server URL (e.g. http://localhost:3000):',
        initial: '',
      },
      {
        type: 'input',
        name: 'openapiKey',
        message: 'OpenClaw / OpenAI API Key (for conflict resolution):',
        initial: '',
      },
      {
        type: 'input',
        name: 'model',
        message: 'AI model to use for merging:',
        initial: 'gpt-4o',
      },
    ]);
    name = answers.name || name;
    email = answers.email || email;
    remote = answers.remote || remote;
    openapiKey = answers.openapiKey || openapiKey;
    model = answers.model || model;
  }

  await repo.init({ name, email, remote, openapiKey, model });

  logger.success(`Initialized empty SkillGit repository in ${cwd}/.skillgit/`);
  logger.info(`Remote: ${remote || chalk.dim('(not set, use: ski remote set-url origin <url>)')}`);
  logger.info(`AI model: ${model}`);
}

module.exports = cmdInit;
