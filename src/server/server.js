'use strict';

/**
 * SkillSync 远端服务器
 * 运行方式: skillsync server [--port 3000] [--data-dir ./skillsync-data] [--token mytoken]
 *
 * 提供以下 API：
 *   GET  /api/ping
 *   GET  /api/refs                -> 获取所有分支的最新 commitId
 *   GET  /api/commits/:id         -> 获取 commit 对象
 *   GET  /api/objects/:hash       -> 获取文件内容对象
 *   POST /api/push                -> 推送 pack
 *   POST /api/init                -> 初始化仓库元数据
 *   GET  /api/log/:branch         -> 获取分支日志
 *   GET  /api/skills              -> 列出所有 skill 名称
 */

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs-extra');

class SkillSyncServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.dataDir = options.dataDir || path.join(process.cwd(), 'skillsync-data');
    this.token = options.token || '';
    this.verbose = options.verbose || false;

    this.refsDir = path.join(this.dataDir, 'refs', 'heads');
    this.objectsDir = path.join(this.dataDir, 'objects');
    this.logsDir = path.join(this.dataDir, 'logs');
    this.metaPath = path.join(this.dataDir, 'meta.json');
  }

  async start() {
    await fs.mkdirs(this.refsDir);
    await fs.mkdirs(this.objectsDir);
    await fs.mkdirs(this.logsDir);

    if (!fs.existsSync(this.metaPath)) {
      await fs.writeJson(this.metaPath, { created: new Date().toISOString() }, { spaces: 2 });
    }

    const server = http.createServer(this._handleRequest.bind(this));
    server.listen(this.port, () => {
      console.log(`\n🐾 SkillSync server running at http://0.0.0.0:${this.port}`);
      console.log(`   Data directory: ${this.dataDir}`);
      if (this.token) {
        console.log(`   Auth token: ${this.token.substring(0, 4)}${'*'.repeat(this.token.length - 4)}`);
      } else {
        console.log('   ⚠ No auth token (open access)');
      }
      console.log('');
    });

    return server;
  }

  async _handleRequest(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 鉴权
    if (this.token) {
      const auth = req.headers['authorization'] || '';
      const provided = auth.replace(/^Bearer\s+/, '').trim();
      if (provided !== this.token) {
        this._sendError(res, 401, 'Unauthorized');
        return;
      }
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (this.verbose) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
    }

    try {
      if (req.method === 'GET' && pathname === '/api/ping') {
        return this._sendJson(res, { ok: true, version: '1.0.0' });
      }

      if (req.method === 'GET' && pathname === '/api/refs') {
        return await this._handleGetRefs(req, res);
      }

      if (req.method === 'GET' && pathname.startsWith('/api/commits/')) {
        const id = pathname.slice('/api/commits/'.length);
        return await this._handleGetCommit(req, res, id);
      }

      if (req.method === 'GET' && pathname.startsWith('/api/objects/')) {
        const hash = pathname.slice('/api/objects/'.length);
        return await this._handleGetObject(req, res, hash);
      }

      if (req.method === 'POST' && pathname === '/api/push') {
        return await this._handlePush(req, res);
      }

      if (req.method === 'POST' && pathname === '/api/init') {
        return await this._handleInit(req, res);
      }

      if (req.method === 'GET' && pathname.startsWith('/api/log/')) {
        const branch = pathname.slice('/api/log/'.length);
        return await this._handleGetLog(req, res, branch);
      }

      if (req.method === 'GET' && pathname === '/api/skills') {
        return await this._handleGetSkills(req, res);
      }

      this._sendError(res, 404, 'Not Found');
    } catch (err) {
      console.error('Server error:', err.message);
      this._sendError(res, 500, err.message);
    }
  }

  async _handleGetRefs(req, res) {
    const refs = {};
    if (fs.existsSync(this.refsDir)) {
      const files = await fs.readdir(this.refsDir);
      for (const f of files) {
        const content = await fs.readFile(path.join(this.refsDir, f), 'utf8');
        refs[f] = content.trim();
      }
    }
    this._sendJson(res, refs);
  }

  async _handleGetCommit(req, res, commitId) {
    const objPath = this._objectPath(commitId);
    if (!fs.existsSync(objPath)) {
      return this._sendError(res, 404, `Commit not found: ${commitId}`);
    }
    const raw = await fs.readFile(objPath, 'utf8');
    try {
      this._sendJson(res, JSON.parse(raw));
    } catch {
      this._sendJson(res, { raw });
    }
  }

  async _handleGetObject(req, res, hash) {
    const objPath = this._objectPath(hash);
    if (!fs.existsSync(objPath)) {
      return this._sendError(res, 404, `Object not found: ${hash}`);
    }
    const content = await fs.readFile(objPath, 'utf8');
    this._sendJson(res, { hash, content });
  }

  async _handlePush(req, res) {
    const body = await this._readBody(req);
    const pack = JSON.parse(body);

    const { branch, commits, objects, headCommitId } = pack;

    if (!branch) return this._sendError(res, 400, 'Missing branch');
    if (!commits || !Array.isArray(commits)) return this._sendError(res, 400, 'Missing commits');

    // 检查是否需要 fast-forward（防止强制推送覆盖他人工作）
    const refPath = path.join(this.refsDir, branch);
    if (fs.existsSync(refPath)) {
      const currentHead = (await fs.readFile(refPath, 'utf8')).trim();
      // 检查远端 head 是否在推送的 commit 链中（fast-forward 检查）
      const pushChain = new Set(commits.map((c) => c.id));
      const parentChain = new Set(commits.map((c) => c.parent).filter(Boolean));
      if (!parentChain.has(currentHead) && !pushChain.has(currentHead) && currentHead !== headCommitId) {
        // 远端有新的提交，需要先 pull
        return this._sendError(
          res,
          409,
          'Remote has diverged. Run `skillsync pull` first to incorporate remote changes.'
        );
      }
    }

    // 存储对象
    for (const [hash, content] of Object.entries(objects || {})) {
      const objPath = this._objectPath(hash);
      await fs.ensureDir(path.dirname(objPath));
      await fs.writeFile(objPath, content, 'utf8');
    }

    // 存储 commits
    for (const commit of commits) {
      const objPath = this._objectPath(commit.id);
      await fs.ensureDir(path.dirname(objPath));
      await fs.writeFile(objPath, JSON.stringify(commit), 'utf8');

      // 追加日志
      const logFile = path.join(this.logsDir, branch);
      await fs.ensureFile(logFile);
      await fs.appendFile(
        logFile,
        JSON.stringify({
          commitId: commit.id,
          message: commit.message,
          author: commit.author,
          email: commit.email || '',
          timestamp: commit.timestamp,
        }) + '\n'
      );
    }

    // 更新 ref
    if (headCommitId) {
      await fs.writeFile(refPath, headCommitId);
    } else if (commits.length > 0) {
      await fs.writeFile(refPath, commits[0].id);
    }

    this._sendJson(res, {
      ok: true,
      branch,
      commitsReceived: commits.length,
      objectsReceived: Object.keys(objects || {}).length,
    });
  }

  async _handleInit(req, res) {
    const body = await this._readBody(req);
    const meta = JSON.parse(body);
    await fs.writeJson(this.metaPath, { ...meta, created: new Date().toISOString() }, { spaces: 2 });
    this._sendJson(res, { ok: true });
  }

  async _handleGetLog(req, res, branch) {
    const logFile = path.join(this.logsDir, branch);
    if (!fs.existsSync(logFile)) {
      return this._sendJson(res, []);
    }
    const raw = await fs.readFile(logFile, 'utf8');
    const entries = raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();
    this._sendJson(res, entries);
  }

  async _handleGetSkills(req, res) {
    // 从最新 commit 中提取 skill 列表
    const refs = {};
    if (fs.existsSync(this.refsDir)) {
      const files = await fs.readdir(this.refsDir);
      for (const f of files) {
        const c = await fs.readFile(path.join(this.refsDir, f), 'utf8');
        refs[f] = c.trim();
      }
    }
    const skills = new Set();
    for (const commitId of Object.values(refs)) {
      const objPath = this._objectPath(commitId);
      if (fs.existsSync(objPath)) {
        const raw = await fs.readFile(objPath, 'utf8');
        try {
          const commit = JSON.parse(raw);
          for (const skillName of Object.keys(commit.skills || {})) {
            skills.add(skillName);
          }
        } catch {}
      }
    }
    this._sendJson(res, Array.from(skills));
  }

  _objectPath(hash) {
    const dir = hash.substring(0, 2);
    const file = hash.substring(2);
    return path.join(this.objectsDir, dir, file);
  }

  _sendJson(res, data, status = 200) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }

  _sendError(res, status, message) {
    this._sendJson(res, { error: message }, status);
  }

  _readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }
}

module.exports = SkillSyncServer;
