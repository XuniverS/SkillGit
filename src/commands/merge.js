'use strict';

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const ora = require('ora');
const { prompt } = require('enquirer');
const Repository = require('../lib/repository');
const { mergeSkillConflicts, buildMergePrompt } = require('../lib/merger');
const logger = require('../utils/logger');

/**
 * skillsync merge --ai         使用 AI 合并所有冲突文件
 * skillsync merge --show-prompt 只显示 AI prompt 不实际调用
 * skillsync merge <skill>      合并指定 skill 的冲突
 */
async function cmdMerge(skillArg, options) {
  const repo = Repository.requireRepo();
  const config = await repo.getConfig();

  // 查找所有含冲突标记的文件
  const conflictMap = await findConflictFiles(repo, skillArg);

  if (Object.keys(conflictMap).length === 0) {
    logger.success('No conflicts found. Working tree is clean.');
    return;
  }

  logger.title('\nConflicted skills:');
  for (const [skillName, files] of Object.entries(conflictMap)) {
    logger.skillConflict(skillName);
    for (const f of files) {
      console.log(`    ${chalk.dim(f)}`);
    }
  }
  console.log('');

  if (options.showPrompt) {
    // 只展示 AI prompt
    for (const [skillName, files] of Object.entries(conflictMap)) {
      for (const file of files) {
        const { localContent, remoteContent } = await parseConflictFile(
          path.join(repo.cwd, skillName, file)
        );
        const p = buildMergePrompt({
          skillName,
          fileName: file,
          localContent,
          remoteContent,
          baseContent: '',
          localAuthor: config.user.name || 'local',
          remoteAuthor: 'remote',
          localMessage: '',
          remoteMessage: '',
        });
        console.log(chalk.bold.yellow(`\n─── Merge Prompt for ${skillName}/${file} ───`));
        console.log(p);
        console.log(chalk.dim('─'.repeat(60)));
      }
    }
    return;
  }

  if (!options.ai && !options.yes) {
    const answer = await prompt({
      type: 'confirm',
      name: 'proceed',
      message: `Use AI (${config.user.model || 'gpt-4o'}) to resolve ${Object.keys(conflictMap).length} conflict(s)?`,
      initial: true,
    });
    if (!answer.proceed) {
      logger.info('Merge cancelled. Fix conflicts manually, then `skillsync add` and `skillsync commit`.');
      return;
    }
  }

  const apiKey = config.user.openapiKey || process.env.OPENCLAW_API_KEY || process.env.OPENAI_API_KEY;
  const model = config.user.model || 'gpt-4o';
  const apiBase = config.user.apiBase || process.env.OPENCLAW_API_BASE || 'https://api.openai.com/v1';

  if (!apiKey) {
    logger.error(
      'No API key configured.\n  Run: skillsync config set user.openapiKey <your-key>\n  Or set env: OPENCLAW_API_KEY=<your-key>'
    );
    process.exit(1);
  }

  let totalResolved = 0;
  let manualNeeded = 0;

  for (const [skillName, files] of Object.entries(conflictMap)) {
    const conflictFilesList = [];
    for (const file of files) {
      const filePath = path.join(repo.cwd, skillName, file);
      const { localContent, remoteContent } = await parseConflictFile(filePath);
      conflictFilesList.push({ fileName: file, localContent, remoteContent, baseContent: '' });
    }

    const spinner = ora(`  AI merging: ${skillName} (${files.length} file(s))...`).start();

    try {
      const result = await mergeSkillConflicts(
        {
          skillName,
          conflictFiles: conflictFilesList,
          localCommit: { author: config.user.name, message: '' },
          remoteCommit: { author: 'remote', message: '' },
        },
        { apiKey, model, apiBase }
      );

      for (const [fileName, res] of Object.entries(result.results)) {
        const filePath = path.join(repo.cwd, skillName, fileName);
        await fs.writeFile(filePath, res.merged, 'utf8');
        totalResolved++;
      }

      if (result.allAutoMerged) {
        spinner.succeed(`  Resolved: ${skillName}`);
      } else {
        spinner.warn(`  Partial: ${skillName} (manual review needed)`);
        manualNeeded++;
      }
    } catch (err) {
      spinner.fail(`  Failed: ${skillName} - ${err.message}`);
    }
  }

  logger.separator();
  logger.info(`${totalResolved} file(s) merged.`);
  if (manualNeeded > 0) {
    logger.warn(`${manualNeeded} skill(s) need manual review (look for <!-- MERGE_CONFLICT --> markers).`);
  } else {
    logger.success('All conflicts resolved! Run:');
    logger.plain('  skillsync add .');
    logger.plain('  skillsync commit -m "resolve merge conflicts"');
  }
}

/**
 * 找到所有包含冲突标记的文件
 * 返回 { skillName: [relFilePath, ...] }
 */
async function findConflictFiles(repo, skillNameFilter) {
  const result = {};

  let skillDirs;
  if (skillNameFilter) {
    skillDirs = [skillNameFilter];
  } else {
    skillDirs = await repo._listLocalSkills();
  }

  for (const skillName of skillDirs) {
    const skillDir = path.join(repo.cwd, skillName);
    const files = {};
    await collectConflictFiles(skillDir, skillDir, files);
    if (Object.keys(files).length > 0) {
      result[skillName] = Object.keys(files);
    }
  }

  return result;
}

async function collectConflictFiles(baseDir, currentDir, result) {
  if (!fs.existsSync(currentDir)) return;
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await collectConflictFiles(baseDir, absPath, result);
    } else {
      const content = await fs.readFile(absPath, 'utf8').catch(() => '');
      if (content.includes('<<<<<<< LOCAL')) {
        result[path.relative(baseDir, absPath)] = true;
      }
    }
  }
}

/**
 * 解析冲突文件，提取 local 和 remote 内容
 */
async function parseConflictFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const localLines = [];
  const remoteLines = [];
  let section = 'before'; // before | local | remote

  for (const line of content.split('\n')) {
    if (line.startsWith('<<<<<<< LOCAL')) {
      section = 'local';
      continue;
    }
    if (line.startsWith('=======')) {
      section = 'remote';
      continue;
    }
    if (line.startsWith('>>>>>>> REMOTE')) {
      section = 'before';
      continue;
    }
    if (section === 'local') localLines.push(line);
    else if (section === 'remote') remoteLines.push(line);
  }

  return {
    localContent: localLines.join('\n'),
    remoteContent: remoteLines.join('\n'),
  };
}

module.exports = cmdMerge;
