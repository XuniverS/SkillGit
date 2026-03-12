'use strict';

const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const Repository = require('../lib/repository');
const { RemoteClient, setLocalRemoteRef } = require('../lib/remote');
const logger = require('../utils/logger');

/**
 * skl fetch [remote] [branch]
 * 只下载远端数据，不修改工作目录（类似 git fetch）
 */
async function cmdFetch(remoteName, branchArg, options) {
  const repo = Repository.requireRepo();
  const config = await repo.getConfig();
  const remote = remoteName || 'origin';
  const remoteUrl = config.remote[remote] || config.remote.origin;

  if (!remoteUrl) {
    logger.error(`Remote '${remote}' is not configured.`);
    process.exit(1);
  }

  const token = config.user.token || process.env.SKILLSYNC_TOKEN || '';
  const client = new RemoteClient(remoteUrl, token);

  const spinner = ora(`Fetching from ${chalk.cyan(remote)}...`).start();

  try {
    const refs = await client.fetchRefs();

    let fetchBranches = branchArg ? [branchArg] : Object.keys(refs);
    let totalCommits = 0;

    for (const branch of fetchBranches) {
      const remoteCommitId = refs[branch];
      if (!remoteCommitId) continue;

      // 获取 commit 链
      let currentId = remoteCommitId;
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

        // 下载对象
        for (const [, skillInfo] of Object.entries(commit.skills || {})) {
          for (const [, hash] of Object.entries(skillInfo.files || {})) {
            const objPath = repo._objectPath(hash);
            const fs = require('fs-extra');
            if (!fs.existsSync(objPath)) {
              const content = await client.fetchObject(hash);
              if (content !== null) {
                await repo._storeObject(hash, content);
              }
            }
          }
        }

        // 存储 commit 对象
        await repo._storeObject(commit.id, JSON.stringify(commit));
        totalCommits++;

        currentId = commit.parent;
      }

      await setLocalRemoteRef(repo, remote, branch, remoteCommitId);
    }

    spinner.succeed(`Fetched ${totalCommits} object(s) from ${remote}`);

    for (const branch of fetchBranches) {
      const remoteCommitId = refs[branch];
      if (remoteCommitId) {
        logger.dim(` * ${remote}/${branch} -> ${remoteCommitId.substring(0, 12)}`);
      }
    }
  } catch (err) {
    spinner.fail(`Fetch failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = cmdFetch;
