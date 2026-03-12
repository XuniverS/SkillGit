'use strict';

/**
 * Remote 模块：负责与远端仓库（GitHub / 自托管 HTTP 服务）通信
 *
 * 远端协议（简单 HTTP REST）：
 *   GET  /api/repo/:repoId/refs          -> 获取所有分支最新 commitId
 *   GET  /api/repo/:repoId/commits/:id   -> 获取某个 commit 对象
 *   GET  /api/repo/:repoId/objects/:hash -> 获取某个对象内容
 *   POST /api/repo/:repoId/push          -> 推送 pack（commits + objects）
 *   POST /api/repo/:repoId/init          -> 创建远端仓库
 *
 * 远端 URL 格式：
 *   http://host:port/repo/<repoId>
 *   或者 https://raw.githubusercontent.com/<user>/<repo>  (只读)
 *
 * 鉴权：通过 Authorization: Bearer <token> 头
 */

const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs-extra');

class RemoteClient {
  constructor(remoteUrl, token) {
    this.remoteUrl = remoteUrl ? remoteUrl.replace(/\/$/, '') : null;
    this.token = token || '';
  }

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async _get(endpoint) {
    const url = `${this.remoteUrl}${endpoint}`;
    const res = await fetch(url, { headers: this._headers() });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Remote error [${res.status}] GET ${endpoint}: ${text}`);
    }
    return res.json();
  }

  async _post(endpoint, body) {
    const url = `${this.remoteUrl}${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Remote error [${res.status}] POST ${endpoint}: ${text}`);
    }
    return res.json();
  }

  /**
   * 获取远端分支最新 commit
   */
  async fetchRefs() {
    return this._get('/api/refs');
  }

  /**
   * 获取某分支最新 commitId
   */
  async fetchRef(branch) {
    const refs = await this.fetchRefs();
    return refs[branch] || null;
  }

  /**
   * 获取某个 commit 对象
   */
  async fetchCommit(commitId) {
    return this._get(`/api/commits/${commitId}`);
  }

  /**
   * 获取某个对象内容（文件内容）
   */
  async fetchObject(hash) {
    const url = `${this.remoteUrl}/api/objects/${hash}`;
    const res = await fetch(url, { headers: this._headers() });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Remote error [${res.status}] GET /api/objects/${hash}`);
    }
    const data = await res.json();
    return data.content;
  }

  /**
   * 推送：上传 commits 和 objects
   */
  async push(pack) {
    return this._post('/api/push', pack);
  }

  /**
   * 初始化远端仓库
   */
  async initRepo(meta) {
    return this._post('/api/init', meta);
  }

  /**
   * 检查连通性
   */
  async ping() {
    try {
      const url = `${this.remoteUrl}/api/ping`;
      const res = await fetch(url, { headers: this._headers() });
      return res.ok;
    } catch {
      return false;
    }
  }
}

/**
 * 构建推送包（pack）
 * repo: Repository 实例
 * branch: 分支名
 * sinceCommitId: 上次成功推送的 commitId（增量推送）
 */
async function buildPushPack(repo, branch, sinceCommitId) {
  const log = await repo.getLog(branch);
  const pack = {
    branch,
    commits: [],
    objects: {},
  };

  // 收集需要推送的 commits（比 sinceCommitId 新的）
  const commitsToSend = [];
  for (const entry of log) {
    if (sinceCommitId && entry.commitId === sinceCommitId) break;
    commitsToSend.push(entry.commitId);
  }

  for (const commitId of commitsToSend) {
    const commit = await repo.getCommit(commitId);
    if (!commit) continue;
    pack.commits.push(commit);

    // 收集 commit 中的所有 skill 文件对象
    for (const [, skillInfo] of Object.entries(commit.skills || {})) {
      for (const [, hash] of Object.entries(skillInfo.files || {})) {
        if (!pack.objects[hash]) {
          const content = await repo.readObject(hash);
          if (content !== null) {
            pack.objects[hash] = content;
          }
        }
      }
    }
  }

  return pack;
}

/**
 * 将远端 pack 应用到本地仓库对象存储
 */
async function applyFetchPack(repo, pack) {
  // 存储对象
  for (const [hash, content] of Object.entries(pack.objects || {})) {
    await repo._storeObject(hash, content);
  }

  // 更新远端 refs
  if (pack.branch && pack.headCommitId) {
    const refPath = path.join(repo.refsDir, 'remotes', 'origin', pack.branch);
    await fs.ensureDir(path.dirname(refPath));
    await fs.writeFile(refPath, pack.headCommitId);
  }

  return pack.commits || [];
}

/**
 * 获取远端分支头 commit 存储在本地的路径
 */
function getRemoteRefPath(repo, remote, branch) {
  return path.join(repo.refsDir, 'remotes', remote, branch);
}

async function getLocalRemoteRef(repo, remote, branch) {
  const refPath = getRemoteRefPath(repo, remote, branch);
  if (!fs.existsSync(refPath)) return null;
  return (await fs.readFile(refPath, 'utf8')).trim();
}

async function setLocalRemoteRef(repo, remote, branch, commitId) {
  const refPath = getRemoteRefPath(repo, remote, branch);
  await fs.ensureDir(path.dirname(refPath));
  await fs.writeFile(refPath, commitId);
}

module.exports = {
  RemoteClient,
  buildPushPack,
  applyFetchPack,
  getLocalRemoteRef,
  setLocalRemoteRef,
};
