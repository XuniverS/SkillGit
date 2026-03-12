'use strict';

const SKILLSYNC_DIR = '.skillgit';
const CONFIG_FILE = 'config.json';
const INDEX_FILE = 'index.json';
const OBJECTS_DIR = 'objects';
const REFS_DIR = 'refs';
const LOGS_DIR = 'logs';
const REMOTE_DIR = 'remote';
const MERGE_HEAD_FILE = 'MERGE_HEAD';
const HEAD_FILE = 'HEAD';
const CONFLICT_MARKER_START = '<<<<<<< LOCAL';
const CONFLICT_MARKER_MID = '=======';
const CONFLICT_MARKER_END = '>>>>>>> REMOTE';

const SKILL_EXTENSIONS = ['.md', '.txt', '.json', '.yaml', '.yml'];
const SKILL_FILE_PATTERN = 'SKILL.md';

const DEFAULT_REMOTE_URL = '';
const DEFAULT_BRANCH = 'main';
const DEFAULT_AUTHOR = 'unknown';

const OPENCLAW_API_BASE = 'https://api.openclaw.ai/v1';

const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  CONFLICT: 2,
  AUTH_ERROR: 3,
};

module.exports = {
  SKILLSYNC_DIR, // used as '.skillgit' directory name
  CONFIG_FILE,
  INDEX_FILE,
  OBJECTS_DIR,
  REFS_DIR,
  LOGS_DIR,
  REMOTE_DIR,
  MERGE_HEAD_FILE,
  HEAD_FILE,
  CONFLICT_MARKER_START,
  CONFLICT_MARKER_MID,
  CONFLICT_MARKER_END,
  SKILL_EXTENSIONS,
  SKILL_FILE_PATTERN,
  DEFAULT_REMOTE_URL,
  DEFAULT_BRANCH,
  DEFAULT_AUTHOR,
  OPENCLAW_API_BASE,
  EXIT_CODES,
};
