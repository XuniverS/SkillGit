#!/usr/bin/env node
'use strict';

const { program, Command } = require('commander');
const chalk = require('chalk');
const { version } = require('../package.json');

// ────────────────────────────────────────────────
//  命令导入
// ────────────────────────────────────────────────
const cmdInit = require('../src/commands/init');
const cmdAdd = require('../src/commands/add');
const cmdCommit = require('../src/commands/commit');
const cmdStatus = require('../src/commands/status');
const cmdDiff = require('../src/commands/diff');
const cmdLog = require('../src/commands/log');
const cmdPush = require('../src/commands/push');
const cmdPull = require('../src/commands/pull');
const cmdFetch = require('../src/commands/fetch');
const cmdClone = require('../src/commands/clone');
const cmdMerge = require('../src/commands/merge');
const cmdServer = require('../src/commands/server');
const { cmdConfig, cmdRemote } = require('../src/commands/config');

// ────────────────────────────────────────────────
//  全局错误处理
// ────────────────────────────────────────────────
function handleError(err) {
  if (process.env.DEBUG) {
    console.error(chalk.red('\n[DEBUG] Stack trace:'));
    console.error(err.stack);
  } else {
    console.error(chalk.red('✖'), err.message);
  }
  process.exit(1);
}

process.on('uncaughtException', handleError);
process.on('unhandledRejection', (reason) => handleError(reason instanceof Error ? reason : new Error(String(reason))));

// ────────────────────────────────────────────────
//  程序定义
// ────────────────────────────────────────────────
program
  .name('ski')
  .version(version, '-v, --version')
  .description(
    chalk.bold.blue('🐾 SkillSync') +
    ' — Git-like version control for OpenClaw Skills with AI-powered conflict resolution'
  );

// ── init ──────────────────────────────────────
program
  .command('init')
  .description('Initialize a new SkillSync repository in the current directory')
  .option('-n, --name <name>', 'Your name')
  .option('-e, --email <email>', 'Your email')
  .option('-r, --remote <url>', 'Remote server URL')
  .option('-k, --openapi-key <key>', 'OpenClaw API key for conflict resolution')
  .option('-m, --model <model>', 'AI model to use (default: gpt-4o)')
  .option('-y, --yes', 'Skip interactive prompts, use defaults')
  .action(async (options) => {
    await cmdInit(options).catch(handleError);
  });

// ── clone ─────────────────────────────────────
program
  .command('clone <remote-url> [directory]')
  .description('Clone a remote SkillSync repository')
  .option('-b, --branch <branch>', 'Branch to clone (default: main)')
  .option('-t, --token <token>', 'Authentication token')
  .option('-k, --openapi-key <key>', 'OpenClaw API key')
  .action(async (remoteUrl, directory, options) => {
    await cmdClone(remoteUrl, directory, options).catch(handleError);
  });

// ── add ───────────────────────────────────────
program
  .command('add [skills...]')
  .description('Stage one or more skills for commit (use "." to add all)')
  .action(async (skills, options) => {
    await cmdAdd(skills && skills.length ? skills : ['.'], options).catch(handleError);
  });

// ── commit ────────────────────────────────────
program
  .command('commit')
  .description('Record staged changes to the repository')
  .option('-m, --message <message>', 'Commit message')
  .action(async (options) => {
    await cmdCommit(options).catch(handleError);
  });

// ── status ────────────────────────────────────
program
  .command('status')
  .alias('st')
  .description('Show the working tree status')
  .action(async (options) => {
    await cmdStatus(options).catch(handleError);
  });

// ── diff ──────────────────────────────────────
program
  .command('diff [skill]')
  .description('Show changes between working tree and last commit')
  .action(async (skill, options) => {
    await cmdDiff(skill, options).catch(handleError);
  });

// ── log ───────────────────────────────────────
program
  .command('log')
  .description('Show commit history')
  .option('-n <number>', 'Limit number of commits shown')
  .action(async (options) => {
    await cmdLog(options).catch(handleError);
  });

// ── push ──────────────────────────────────────
program
  .command('push [remote] [branch]')
  .description('Push commits to the remote repository')
  .action(async (remote, branch, options) => {
    await cmdPush(remote, branch, options).catch(handleError);
  });

// ── pull ──────────────────────────────────────
program
  .command('pull [remote] [branch]')
  .description('Fetch and merge remote changes (with AI conflict resolution)')
  .action(async (remote, branch, options) => {
    await cmdPull(remote, branch, options).catch(handleError);
  });

// ── fetch ─────────────────────────────────────
program
  .command('fetch [remote] [branch]')
  .description('Download remote objects without merging')
  .action(async (remote, branch, options) => {
    await cmdFetch(remote, branch, options).catch(handleError);
  });

// ── merge ─────────────────────────────────────
program
  .command('merge [skill]')
  .description('Resolve skill conflicts using AI (OpenClaw)')
  .option('--ai', 'Automatically use AI without confirmation')
  .option('--show-prompt', 'Display the AI merge prompt without calling the API')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (skill, options) => {
    await cmdMerge(skill, options).catch(handleError);
  });

// ── config ────────────────────────────────────
const configCmd = program
  .command('config')
  .description('Get or set repository configuration');

configCmd
  .command('list')
  .alias('ls')
  .description('List all configuration values')
  .action(async () => {
    await cmdConfig('list').catch(handleError);
  });

configCmd
  .command('get <key>')
  .description('Get a configuration value (e.g. user.name)')
  .action(async (key) => {
    await cmdConfig('get', key).catch(handleError);
  });

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value (e.g. user.openapiKey sk-xxx)')
  .action(async (key, value) => {
    await cmdConfig('set', key, value).catch(handleError);
  });

// ── remote ────────────────────────────────────
const remoteCmd = program
  .command('remote')
  .description('Manage remote repository connections');

remoteCmd
  .command('set-url <name> <url>')
  .description('Set the URL for a remote (e.g. origin http://localhost:3000)')
  .action(async (name, url) => {
    await cmdRemote('set-url', name, url).catch(handleError);
  });

remoteCmd
  .command('get-url [name]')
  .description('Get the URL of a remote')
  .action(async (name) => {
    await cmdRemote('get-url', name).catch(handleError);
  });

remoteCmd
  .command('list')
  .alias('-v')
  .description('List all remotes')
  .action(async () => {
    await cmdRemote('list').catch(handleError);
  });

// shorthand: `ski remote -v`  and `ski remote`
remoteCmd
  .action(async (options) => {
    const flag = options.v || options.list;
    await cmdRemote(flag ? 'list' : 'list').catch(handleError);
  });

// ── server ────────────────────────────────────
program
  .command('server')
  .description('Start the SkillSync remote server')
  .option('-p, --port <port>', 'Port to listen on (default: 3000)')
  .option('-d, --data-dir <dir>', 'Directory to store repository data (default: ./skillsync-data)')
  .option('-t, --token <token>', 'Authentication token (leave empty for open access)')
  .option('--verbose', 'Verbose request logging')
  .action(async (options) => {
    await cmdServer(options).catch(handleError);
  });

// ── whoami ────────────────────────────────────
program
  .command('whoami')
  .description('Show current user configuration')
  .action(async () => {
    const Repository = require('../src/lib/repository');
    const repo = Repository.requireRepo();
    const config = await repo.getConfig().catch(handleError);
    const chalk = require('chalk');
    console.log(chalk.bold('Current user:'));
    console.log(`  name:  ${chalk.green(config.user.name || '(not set)')}`);
    console.log(`  email: ${chalk.green(config.user.email || '(not set)')}`);
    console.log(`  model: ${chalk.green(config.user.model || 'gpt-4o')}`);
    const hasKey = !!config.user.openapiKey;
    console.log(`  api key: ${hasKey ? chalk.green('[configured]') : chalk.red('[not set]')}`);
  });

// ────────────────────────────────────────────────
//  解析
// ────────────────────────────────────────────────
program.parse(process.argv);

// 无子命令时显示帮助
if (process.argv.length <= 2) {
  program.help();
}
