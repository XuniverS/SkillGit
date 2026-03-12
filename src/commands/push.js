'use strict';

const chalk = require('chalk');
const ora = require('ora');
const Repository = require('../lib/repository');
const { RemoteClient, buildPushPack, setLocalRemoteRef } = require('../lib/remote');
const logger = require('../utils/logger');

async function cmdPush(remoteName, branchArg, options) {
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

  const spinner = ora(`Pushing to ${chalk.cyan(remote)} (${branch})...`).start();

  try {
    // 检查连通性
    const alive = await client.ping();
    if (!alive) {
      spinner.fail(`Cannot reach remote server: ${remoteUrl}`);
      process.exit(1);
    }

    // 获取远端当前 commitId（用于增量推送）
    let remoteCommitId = null;
    try {
      remoteCommitId = await client.fetchRef(branch);
    } catch {
      // 远端没有这个分支，全量推送
    }

    // 构建 pack
    const pack = await buildPushPack(repo, branch, remoteCommitId);

    if (pack.commits.length === 0) {
      spinner.succeed('Already up to date. Nothing to push.');
      return;
    }

    // 推送
    const result = await client.push({ ...pack, headCommitId: pack.commits[0]?.id });
    spinner.succeed(`Pushed ${pack.commits.length} commit(s) to ${remote}/${branch}`);

    // 更新本地远端引用
    await setLocalRemoteRef(repo, remote, branch, pack.commits[0]?.id);

    logger.info(`Remote: ${remoteUrl}`);
    logger.dim(`Branch: ${branch} -> ${remote}/${branch}`);
  } catch (err) {
    spinner.fail(`Push failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = cmdPush;
