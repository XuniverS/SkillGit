'use strict';

const fs = require('fs-extra');
const path = require('path');
const {
  SKILLSYNC_DIR,
  CONFIG_FILE,
  INDEX_FILE,
  OBJECTS_DIR,
  REFS_DIR,
  LOGS_DIR,
  HEAD_FILE,
  MERGE_HEAD_FILE,
  DEFAULT_BRANCH,
} = require('./constants');
const { hashContent, generateCommitId } = require('../utils/hash');

class Repository {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
    this.skillsyncDir = path.join(this.cwd, SKILLSYNC_DIR);
    this.configPath = path.join(this.skillsyncDir, CONFIG_FILE);
    this.indexPath = path.join(this.skillsyncDir, INDEX_FILE);
    this.objectsDir = path.join(this.skillsyncDir, OBJECTS_DIR);
    this.refsDir = path.join(this.skillsyncDir, REFS_DIR);
    this.logsDir = path.join(this.skillsyncDir, LOGS_DIR);
    this.headPath = path.join(this.skillsyncDir, HEAD_FILE);
    this.mergeHeadPath = path.join(this.skillsyncDir, MERGE_HEAD_FILE);
  }

  /**
   * 检查当前目录是否是一个 skillsync 仓库（向上查找）
   */
  static findRoot(startDir) {
    let dir = startDir || process.cwd();
    while (true) {
      const candidate = path.join(dir, SKILLSYNC_DIR);
      if (fs.existsSync(candidate)) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }

  /**
   * 确保当前目录是仓库，否则抛出错误
   */
  static requireRepo(cwd) {
    const root = Repository.findRoot(cwd);
    if (!root) {
      throw new Error(
        'Not a skillsync repository (or any of the parent directories). Run `skillsync init` to initialize.'
      );
    }
    return new Repository(root);
  }

  // ────────────────────────────────────────────
  //  初始化
  // ────────────────────────────────────────────

  async init(options = {}) {
    if (fs.existsSync(this.skillsyncDir)) {
      throw new Error(`Repository already initialized at ${this.cwd}`);
    }
    await fs.mkdirs(this.skillsyncDir);
    await fs.mkdirs(this.objectsDir);
    await fs.mkdirs(this.refsDir);
    await fs.mkdirs(this.logsDir);
    await fs.mkdirs(path.join(this.refsDir, 'heads'));
    await fs.mkdirs(path.join(this.refsDir, 'remotes'));

    const config = {
      core: {
        branch: options.branch || DEFAULT_BRANCH,
        created: new Date().toISOString(),
      },
      user: {
        name: options.name || '',
        email: options.email || '',
        openapiKey: options.openapiKey || '',
        model: options.model || 'gpt-4o',
      },
      remote: {
        origin: options.remote || '',
      },
    };

    await fs.writeJson(this.configPath, config, { spaces: 2 });
    await fs.writeJson(this.indexPath, { staged: {}, tracked: {} }, { spaces: 2 });

    // HEAD 指向默认分支
    await fs.writeFile(this.headPath, `ref: refs/heads/${config.core.branch}\n`);

    return config;
  }

  // ────────────────────────────────────────────
  //  配置
  // ────────────────────────────────────────────

  async getConfig() {
    if (!fs.existsSync(this.configPath)) {
      throw new Error('Repository config not found. Run `skillsync init` first.');
    }
    return fs.readJson(this.configPath);
  }

  async setConfig(key, value) {
    const config = await this.getConfig();
    const parts = key.split('.');
    let obj = config;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    await fs.writeJson(this.configPath, config, { spaces: 2 });
    return config;
  }

  async getConfigValue(key) {
    const config = await this.getConfig();
    const parts = key.split('.');
    let obj = config;
    for (const part of parts) {
      if (obj == null) return undefined;
      obj = obj[part];
    }
    return obj;
  }

  // ────────────────────────────────────────────
  //  Index（暂存区）
  // ────────────────────────────────────────────

  async getIndex() {
    if (!fs.existsSync(this.indexPath)) {
      return { staged: {}, tracked: {} };
    }
    return fs.readJson(this.indexPath);
  }

  async saveIndex(index) {
    await fs.writeJson(this.indexPath, index, { spaces: 2 });
  }

  /**
   * 将一个 skill 目录加入暂存区
   * skillPath: 相对于 cwd 的路径，如 "my-skill"
   */
  async stageSkill(skillPath) {
    const absPath = path.resolve(this.cwd, skillPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Skill path not found: ${skillPath}`);
    }

    const index = await this.getIndex();
    const skillFiles = await this._readSkillFiles(absPath);
    const skillName = path.relative(this.cwd, absPath);

    // 存储对象
    const fileHashes = {};
    for (const [relFile, content] of Object.entries(skillFiles)) {
      const hash = hashContent(content);
      fileHashes[relFile] = hash;
      await this._storeObject(hash, content);
    }

    index.staged[skillName] = {
      files: fileHashes,
      stagedAt: new Date().toISOString(),
    };

    await this.saveIndex(index);
    return skillName;
  }

  /**
   * 将当前目录下所有 skill 加入暂存区
   */
  async stageAll() {
    const skills = await this._listLocalSkills();
    const staged = [];
    for (const s of skills) {
      await this.stageSkill(s);
      staged.push(s);
    }
    return staged;
  }

  // ────────────────────────────────────────────
  //  Commit
  // ────────────────────────────────────────────

  async commit(message, options = {}) {
    const index = await this.getIndex();
    if (Object.keys(index.staged).length === 0) {
      throw new Error('Nothing to commit. Use `skillsync add <skill>` to stage changes.');
    }

    const config = await this.getConfig();
    const author = options.author || config.user.name || 'unknown';
    const email = options.email || config.user.email || '';

    // 构造 commit 对象
    const parentCommit = await this.getCurrentCommitId();
    const timestamp = new Date().toISOString();
    const commitObj = {
      message,
      author,
      email,
      timestamp,
      parent: parentCommit,
      skills: { ...index.staged },
    };

    const commitId = generateCommitId(JSON.stringify(commitObj), timestamp);
    commitObj.id = commitId;

    // 存储 commit 对象
    await this._storeObject(commitId, JSON.stringify(commitObj));

    // 更新 tracked（合并 staged 进入 tracked）
    for (const [skillName, info] of Object.entries(index.staged)) {
      index.tracked[skillName] = {
        ...info,
        commitId,
      };
    }
    index.staged = {};
    await this.saveIndex(index);

    // 更新 HEAD 分支引用
    const branch = await this.getCurrentBranch();
    const refPath = path.join(this.refsDir, 'heads', branch);
    await fs.writeFile(refPath, commitId);

    // 记录日志
    await this._appendLog(branch, {
      commitId,
      message,
      author,
      email,
      timestamp,
    });

    return commitObj;
  }

  // ────────────────────────────────────────────
  //  HEAD & 分支
  // ────────────────────────────────────────────

  async getCurrentBranch() {
    if (!fs.existsSync(this.headPath)) return DEFAULT_BRANCH;
    const head = await fs.readFile(this.headPath, 'utf8');
    const match = head.trim().match(/^ref: refs\/heads\/(.+)$/);
    return match ? match[1] : DEFAULT_BRANCH;
  }

  async getCurrentCommitId() {
    const branch = await this.getCurrentBranch();
    const refPath = path.join(this.refsDir, 'heads', branch);
    if (!fs.existsSync(refPath)) return null;
    return (await fs.readFile(refPath, 'utf8')).trim();
  }

  async getCommit(commitId) {
    const objPath = this._objectPath(commitId);
    if (!fs.existsSync(objPath)) return null;
    const raw = await fs.readFile(objPath, 'utf8');
    return JSON.parse(raw);
  }

  // ────────────────────────────────────────────
  //  日志
  // ────────────────────────────────────────────

  async getLog(branch) {
    const b = branch || (await this.getCurrentBranch());
    const logFile = path.join(this.logsDir, b);
    if (!fs.existsSync(logFile)) return [];
    const raw = await fs.readFile(logFile, 'utf8');
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .reverse(); // 最新在前
  }

  async _appendLog(branch, entry) {
    const logFile = path.join(this.logsDir, branch);
    await fs.ensureFile(logFile);
    await fs.appendFile(logFile, JSON.stringify(entry) + '\n');
  }

  // ────────────────────────────────────────────
  //  Status
  // ────────────────────────────────────────────

  async getStatus() {
    const index = await this.getIndex();
    const localSkills = await this._listLocalSkills();
    const result = {
      staged: [],
      unstaged: [],
      untracked: [],
      deleted: [],
    };

    // staged
    for (const skillName of Object.keys(index.staged)) {
      result.staged.push({ name: skillName, state: 'staged' });
    }

    // 检查 tracked 的变更
    for (const skillName of localSkills) {
      const absPath = path.resolve(this.cwd, skillName);
      const currentFiles = await this._readSkillFiles(absPath);
      const currentHashes = {};
      for (const [relFile, content] of Object.entries(currentFiles)) {
        currentHashes[relFile] = hashContent(content);
      }

      if (index.staged[skillName]) {
        // 已 staged，跳过
        continue;
      }

      if (index.tracked[skillName]) {
        const trackedHashes = index.tracked[skillName].files || {};
        const changed = JSON.stringify(currentHashes) !== JSON.stringify(trackedHashes);
        if (changed) {
          result.unstaged.push({ name: skillName, state: 'modified' });
        }
      } else {
        result.untracked.push({ name: skillName, state: 'untracked' });
      }
    }

    // 检查已删除的 skill
    for (const skillName of Object.keys(index.tracked)) {
      const absPath = path.resolve(this.cwd, skillName);
      if (!fs.existsSync(absPath)) {
        result.deleted.push({ name: skillName, state: 'deleted' });
      }
    }

    return result;
  }

  // ────────────────────────────────────────────
  //  Diff
  // ────────────────────────────────────────────

  async getDiff(skillName) {
    const index = await this.getIndex();
    const absPath = path.resolve(this.cwd, skillName);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    const currentFiles = await this._readSkillFiles(absPath);
    const tracked = index.tracked[skillName] || index.staged[skillName];
    if (!tracked) {
      throw new Error(`Skill '${skillName}' is not tracked. Run \`skillsync add ${skillName}\` first.`);
    }

    const diffs = {};
    const allFiles = new Set([
      ...Object.keys(currentFiles),
      ...Object.keys(tracked.files || {}),
    ]);

    for (const file of allFiles) {
      const current = currentFiles[file] || '';
      const trackedHash = (tracked.files || {})[file];
      let original = '';
      if (trackedHash) {
        const objPath = this._objectPath(trackedHash);
        if (fs.existsSync(objPath)) {
          original = await fs.readFile(objPath, 'utf8');
        }
      }
      if (current !== original) {
        diffs[file] = { original, current };
      }
    }
    return diffs;
  }

  // ────────────────────────────────────────────
  //  合并冲突
  // ────────────────────────────────────────────

  async setMergeHead(remoteCommitId) {
    await fs.writeFile(this.mergeHeadPath, remoteCommitId);
  }

  async getMergeHead() {
    if (!fs.existsSync(this.mergeHeadPath)) return null;
    return (await fs.readFile(this.mergeHeadPath, 'utf8')).trim();
  }

  async clearMergeHead() {
    if (fs.existsSync(this.mergeHeadPath)) {
      await fs.remove(this.mergeHeadPath);
    }
  }

  /**
   * 检测两个 skill 快照之间的冲突
   * localSnapshot: { files: { relPath: hash } }
   * remoteSnapshot: { files: { relPath: hash } }
   * baseSnapshot: 公共祖先（可能为 null）
   */
  async detectConflicts(localSnapshot, remoteSnapshot, baseSnapshot) {
    const conflicts = [];
    const allFiles = new Set([
      ...Object.keys(localSnapshot.files || {}),
      ...Object.keys(remoteSnapshot.files || {}),
    ]);

    for (const file of allFiles) {
      const localHash = (localSnapshot.files || {})[file];
      const remoteHash = (remoteSnapshot.files || {})[file];
      const baseHash = baseSnapshot ? (baseSnapshot.files || {})[file] : null;

      if (localHash === remoteHash) continue; // 相同，无冲突

      // 如果本地和远端都有修改，且不同 => 冲突
      if (localHash && remoteHash && localHash !== remoteHash) {
        // 如果有公共祖先，检查是否是单侧修改
        if (baseHash) {
          if (localHash === baseHash) continue; // 只有远端改了
          if (remoteHash === baseHash) continue; // 只有本地改了
        }
        conflicts.push(file);
      }
    }

    return conflicts;
  }

  /**
   * 读取对象内容（通过 hash）
   */
  async readObject(hash) {
    const objPath = this._objectPath(hash);
    if (!fs.existsSync(objPath)) return null;
    return fs.readFile(objPath, 'utf8');
  }

  /**
   * 应用远端快照到本地（非冲突文件）
   */
  async applyRemoteSkill(skillName, remoteSnapshot, conflictFiles) {
    const absPath = path.resolve(this.cwd, skillName);
    await fs.mkdirs(absPath);

    for (const [relFile, hash] of Object.entries(remoteSnapshot.files || {})) {
      if (conflictFiles.includes(relFile)) continue; // 冲突文件跳过
      const content = await this.readObject(hash);
      if (content !== null) {
        const filePath = path.join(absPath, relFile);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content, 'utf8');
      }
    }
  }

  /**
   * 写入冲突标记文件
   */
  async writeConflictFile(skillName, relFile, localContent, remoteContent) {
    const absPath = path.resolve(this.cwd, skillName, relFile);
    await fs.ensureDir(path.dirname(absPath));
    const conflictContent = [
      '<<<<<<< LOCAL',
      localContent,
      '=======',
      remoteContent,
      '>>>>>>> REMOTE',
    ].join('\n');
    await fs.writeFile(absPath, conflictContent, 'utf8');
  }

  // ────────────────────────────────────────────
  //  对象存储
  // ────────────────────────────────────────────

  async _storeObject(hash, content) {
    const objPath = this._objectPath(hash);
    await fs.ensureDir(path.dirname(objPath));
    await fs.writeFile(objPath, content, 'utf8');
    return hash;
  }

  _objectPath(hash) {
    // 前 2 位作为目录，其余作为文件名（类似 git）
    const dir = hash.substring(0, 2);
    const file = hash.substring(2);
    return path.join(this.objectsDir, dir, file);
  }

  // ────────────────────────────────────────────
  //  工具方法
  // ────────────────────────────────────────────

  /**
   * 列出本地所有 skill 目录（包含 SKILL.md 的目录）
   */
  async _listLocalSkills() {
    const entries = await fs.readdir(this.cwd, { withFileTypes: true });
    const skills = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (!entry.isDirectory()) continue;
      const skillMd = path.join(this.cwd, entry.name, 'SKILL.md');
      if (fs.existsSync(skillMd)) {
        skills.push(entry.name);
      }
    }
    return skills;
  }

  /**
   * 读取一个 skill 目录下的所有文件内容
   * 返回 { relPath: content } 映射
   */
  async _readSkillFiles(absDir) {
    const files = {};
    if (!fs.existsSync(absDir)) return files;
    await this._collectFiles(absDir, absDir, files);
    return files;
  }

  async _collectFiles(baseDir, currentDir, result) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const absPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await this._collectFiles(baseDir, absPath, result);
      } else {
        const relPath = path.relative(baseDir, absPath);
        result[relPath] = await fs.readFile(absPath, 'utf8');
      }
    }
  }
}

module.exports = Repository;
