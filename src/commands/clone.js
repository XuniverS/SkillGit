'use strict';

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const ora = require('ora');
const Repository = require('../lib/repository');
const { RemoteClient, setLocalRemoteRef } = require('../lib/remote');
const logger = require('../utils/logger');

async function cmdClone(remoteUrl, dirArg, options) {
  if (!remoteUrl) {
    logger.error('Usage: ski clone <remote-url> [directory]');
    process.exit(1);
  }

  // 推断本地目录名
  const dirName = dirArg || path.basename(remoteUrl).replace(/\.git$/, '');
  const targetDir = path.resolve(process.cwd(), dirName);

  if (fs.existsSync(targetDir)) {
    logger.error(`Destination '${dirName}' already exists.`);
    process.exit(1);
  }

  const token = options.token || process.env.SKILLSYNC_TOKEN || '';
  const client = new RemoteClient(remoteUrl, token);

  const spinner = ora(`Cloning from ${chalk.cyan(remoteUrl)}...`).start();

  try {
    // 检查连通性
    const alive = await client.ping();
    if (!alive) {
      spinner.fail(`Cannot reach: ${remoteUrl}`);
      process.exit(1);
    }

    // 获取所有分支
    const refs = await client.fetchRefs();
    if (!refs || Object.keys(refs).length === 0) {
      spinner.warn('Remote repository is empty.');
    }

    // 创建本地目录 + 初始化
    await fs.mkdirs(targetDir);
    const repo = new Repository(targetDir);

    const branch = options.branch || 'main';
    await repo.init({
      remote: remoteUrl,
      branch,
      name: options.name || '',
      email: options.email || '',
      openapiKey: options.openapiKey || process.env.OPENCLAW_API_KEY || process.env.OPENAI_API_KEY || '',
      model: options.model || 'gpt-4o',
    });

    // 设置 token（如果有）
    if (token) {
      await repo.setConfig('user.token', token);
    }

    // 拉取默认分支
    const headCommitId = refs[branch] || refs['main'] || refs['master'] || Object.values(refs)[0];

    if (headCommitId) {
      // 获取 commit 链
      const chain = [];
      let currentId = headCommitId;
      const visited = new Set();

      while (currentId && !visited.has(currentId)) {
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

      // 下载所有对象
      const allObjects = {};
      for (const commit of chain) {
        for (const [, skillInfo] of Object.entries(commit.skills || {})) {
          for (const [, hash] of Object.entries(skillInfo.files || {})) {
            if (!allObjects[hash]) {
              const content = await client.fetchObject(hash);
              if (content !== null) allObjects[hash] = content;
            }
          }
        }
      }

      // 存储对象
      for (const [hash, content] of Object.entries(allObjects)) {
        await repo._storeObject(hash, content);
      }

      // 检出最新 commit 中的 skill 文件
      const headCommit = chain[0];
      if (headCommit) {
        for (const [skillName, skillInfo] of Object.entries(headCommit.skills || {})) {
          const skillDir = path.join(targetDir, skillName);
          await fs.mkdirs(skillDir);
          for (const [relFile, hash] of Object.entries(skillInfo.files || {})) {
            const content = await repo.readObject(hash);
            if (content !== null) {
              const filePath = path.join(skillDir, relFile);
              await fs.ensureDir(path.dirname(filePath));
              await fs.writeFile(filePath, content, 'utf8');
            }
          }
        }

        // 更新 index tracked
        const index = await repo.getIndex();
        for (const [skillName, skillInfo] of Object.entries(headCommit.skills || {})) {
          index.tracked[skillName] = { ...skillInfo, commitId: headCommit.id };
        }
        await repo.saveIndex(index);

        // 写入 HEAD 引用
        const refPath = path.join(repo.refsDir, 'heads', branch);
        await fs.writeFile(refPath, headCommitId);
        await setLocalRemoteRef(repo, 'origin', branch, headCommitId);

        // 写入日志
        for (const commit of chain.slice().reverse()) {
          await repo._appendLog(branch, {
            commitId: commit.id,
            message: commit.message,
            author: commit.author,
            email: commit.email || '',
            timestamp: commit.timestamp,
          });
        }
      }

      spinner.succeed(`Cloned ${chain.length} commit(s) from ${remoteUrl}`);
    } else {
      spinner.succeed('Cloned empty repository');
    }

    logger.success(`Repository cloned to: ${chalk.cyan(targetDir)}`);
    logger.info(`cd ${dirName} && ski status`);
  } catch (err) {
    spinner.fail(`Clone failed: ${err.message}`);
    // 清理失败的目录
    await fs.remove(targetDir).catch(() => {});
    process.exit(1);
  }
}

module.exports = cmdClone;
