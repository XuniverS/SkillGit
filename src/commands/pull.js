'use strict';

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const ora = require('ora');
const Repository = require('../lib/repository');
const { RemoteClient, applyFetchPack, setLocalRemoteRef } = require('../lib/remote');
const { mergeSkillConflicts } = require('../lib/merger');
const logger = require('../utils/logger');

async function cmdPull(remoteName, branchArg, options) {
  const repo = Repository.requireRepo();
  const config = await repo.getConfig();
  const remote = remoteName || 'origin';
  const branch = branchArg || (await repo.getCurrentBranch());
  const remoteUrl = config.remote[remote] || config.remote.origin;

  if (!remoteUrl) {
    logger.error(
      `Remote '${remote}' is not configured. Use: skillsync remote set-url ${remote} <url>`
    );
    process.exit(1);
  }

  const token = config.user.token || process.env.SKILLSYNC_TOKEN || '';
  const client = new RemoteClient(remoteUrl, token);

  const spinner = ora(`Fetching from ${chalk.cyan(remote)}...`).start();

  try {
    // 获取远端最新 commitId
    const remoteCommitId = await client.fetchRef(branch);
    if (!remoteCommitId) {
      spinner.succeed(`Remote branch '${branch}' is empty or does not exist.`);
      return;
    }

    const localCommitId = await repo.getCurrentCommitId();
    if (localCommitId === remoteCommitId) {
      spinner.succeed('Already up to date.');
      return;
    }

    // 获取远端 commit 链直到公共祖先
    const remoteCommits = await fetchCommitChain(client, remoteCommitId, localCommitId);
    if (remoteCommits.length === 0) {
      spinner.succeed('Already up to date.');
      return;
    }

    // 下载所有对象
    const allObjects = {};
    for (const commit of remoteCommits) {
      for (const [, skillInfo] of Object.entries(commit.skills || {})) {
        for (const [, hash] of Object.entries(skillInfo.files || {})) {
          if (!allObjects[hash]) {
            const content = await client.fetchObject(hash);
            if (content !== null) {
              allObjects[hash] = content;
            }
          }
        }
      }
    }

    // 存储远端对象到本地
    for (const [hash, content] of Object.entries(allObjects)) {
      await repo._storeObject(hash, content);
    }

    spinner.succeed(`Fetched ${remoteCommits.length} new commit(s) from ${remote}/${branch}`);

    // ── 合并逻辑 ────────────────────────────────────────
    const remoteHeadCommit = remoteCommits[0]; // 最新的
    const localIndex = await repo.getIndex();

    logger.title('\nMerging remote changes...');

    let hasConflicts = false;
    let conflictSkills = [];
    let autoMergedSkills = [];
    let fastForwardSkills = [];

    // 遍历远端最新 commit 中的所有 skill
    for (const [skillName, remoteSkillInfo] of Object.entries(remoteHeadCommit.skills || {})) {
      const localTracked = localIndex.tracked[skillName];

      if (!localTracked) {
        // 本地没有，直接应用远端
        await repo.applyRemoteSkill(skillName, remoteSkillInfo, []);
        // 更新 tracked
        localIndex.tracked[skillName] = {
          ...remoteSkillInfo,
          commitId: remoteHeadCommit.id,
        };
        fastForwardSkills.push(skillName);
        continue;
      }

      // 检测冲突
      const conflicts = await repo.detectConflicts(localTracked, remoteSkillInfo, null);

      if (conflicts.length === 0) {
        // 无冲突，直接应用远端（fast-forward）
        await repo.applyRemoteSkill(skillName, remoteSkillInfo, []);
        localIndex.tracked[skillName] = {
          ...remoteSkillInfo,
          commitId: remoteHeadCommit.id,
        };
        fastForwardSkills.push(skillName);
        continue;
      }

      // 有冲突 ── 调用 AI 合并
      logger.warn(`\nConflict detected in skill: ${chalk.bold.red(skillName)}`);
      logger.dim(`Conflicting files: ${conflicts.join(', ')}`);

      const apiKey = config.user.openapiKey || process.env.OPENCLAW_API_KEY || process.env.OPENAI_API_KEY;
      const model = config.user.model || 'gpt-4o';
      const apiBase = config.user.apiBase || process.env.OPENCLAW_API_BASE || 'https://api.openai.com/v1';

      if (!apiKey) {
        // 没有 API Key，写入冲突标记
        logger.warn('No API key configured. Writing conflict markers instead.');
        for (const conflictFile of conflicts) {
          const localHash = (localTracked.files || {})[conflictFile];
          const remoteHash = (remoteSkillInfo.files || {})[conflictFile];
          const localContent = localHash ? (await repo.readObject(localHash) || '') : '';
          const remoteContent = remoteHash ? (await repo.readObject(remoteHash) || '') : '';
          await repo.writeConflictFile(skillName, conflictFile, localContent, remoteContent);
        }
        hasConflicts = true;
        conflictSkills.push(skillName);
        continue;
      }

      const aiSpinner = ora(`  AI merging ${skillName}...`).start();

      try {
        // 构建冲突文件列表
        const conflictFilesList = [];
        for (const cf of conflicts) {
          const localHash = (localTracked.files || {})[cf];
          const remoteHash = (remoteSkillInfo.files || {})[cf];
          const localContent = localHash ? (await repo.readObject(localHash) || '') : '';
          const remoteContent = remoteHash ? (await repo.readObject(remoteHash) || '') : '';
          conflictFilesList.push({
            fileName: cf,
            localContent,
            remoteContent,
            baseContent: '',
          });
        }

        const mergeResult = await mergeSkillConflicts(
          {
            skillName,
            conflictFiles: conflictFilesList,
            localCommit: { author: config.user.name, message: 'local changes' },
            remoteCommit: { author: remoteHeadCommit.author, message: remoteHeadCommit.message },
          },
          { apiKey, model, apiBase }
        );

        // 应用合并结果
        for (const [fileName, result] of Object.entries(mergeResult.results)) {
          const filePath = path.join(repo.cwd, skillName, fileName);
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, result.merged, 'utf8');
        }

        // 应用非冲突文件
        await repo.applyRemoteSkill(skillName, remoteSkillInfo, conflicts);

        if (mergeResult.allAutoMerged) {
          aiSpinner.succeed(`  Auto-merged ${skillName} successfully`);
          autoMergedSkills.push(skillName);
        } else {
          aiSpinner.warn(`  Merged ${skillName} with manual review markers`);
          hasConflicts = true;
          conflictSkills.push(skillName);
        }

        // 更新 tracked（使用合并后内容）
        localIndex.tracked[skillName] = {
          ...remoteSkillInfo,
          commitId: remoteHeadCommit.id,
          merged: true,
        };
      } catch (mergeErr) {
        aiSpinner.fail(`  AI merge failed for ${skillName}: ${mergeErr.message}`);
        // 回退到冲突标记
        for (const cf of conflicts) {
          const localHash = (localTracked.files || {})[cf];
          const remoteHash = (remoteSkillInfo.files || {})[cf];
          const localContent = localHash ? (await repo.readObject(localHash) || '') : '';
          const remoteContent = remoteHash ? (await repo.readObject(remoteHash) || '') : '';
          await repo.writeConflictFile(skillName, cf, localContent, remoteContent);
        }
        hasConflicts = true;
        conflictSkills.push(skillName);
      }
    }

    // 保存更新后的 index
    await repo.saveIndex(localIndex);

    // 更新本地 HEAD
    const refPath = path.join(repo.refsDir, 'heads', branch);
    await fs.writeFile(refPath, remoteHeadCommit.id);
    await setLocalRemoteRef(repo, remote, branch, remoteHeadCommit.id);

    // 追加合并 log
    await repo._appendLog(branch, {
      commitId: remoteHeadCommit.id,
      message: `Merged from ${remote}/${branch}: ${remoteHeadCommit.message}`,
      author: remoteHeadCommit.author,
      email: remoteHeadCommit.email || '',
      timestamp: new Date().toISOString(),
    });

    // 打印摘要
    logger.separator();
    if (fastForwardSkills.length > 0) {
      logger.success(`Fast-forwarded: ${fastForwardSkills.join(', ')}`);
    }
    if (autoMergedSkills.length > 0) {
      logger.success(`AI auto-merged: ${autoMergedSkills.join(', ')}`);
    }
    if (conflictSkills.length > 0) {
      logger.warn(`Needs manual review: ${conflictSkills.join(', ')}`);
      logger.info(
        'Fix conflicts marked with <!-- MERGE_CONFLICT --> then run:\n  skillsync add <skill>\n  skillsync commit -m "resolve conflicts"'
      );
    }
  } catch (err) {
    spinner.fail(`Pull failed: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

/**
 * 从远端获取 commit 链，直到公共祖先
 */
async function fetchCommitChain(client, headCommitId, stopAtId) {
  const chain = [];
  let currentId = headCommitId;
  const visited = new Set();

  while (currentId && currentId !== stopAtId && !visited.has(currentId)) {
    visited.add(currentId);
    let commit;
    try {
      commit = await client.fetchCommit(currentId);
    } catch {
      break;
    }
    if (!commit) break;
    chain.push(commit);
    currentId = commit.parent;
  }

  return chain;
}

module.exports = cmdPull;
