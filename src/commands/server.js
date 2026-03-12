'use strict';

const SkillGitServer = require('../server/server');
const logger = require('../utils/logger');

async function cmdServer(options) {
  const port = parseInt(options.port || process.env.SKILLGIT_PORT || '3000', 10);
  const dataDir = options.dataDir || process.env.SKILLGIT_DATA_DIR || './skillgit-data';
  const token = options.token || process.env.SKILLGIT_TOKEN || '';
  const verbose = options.verbose || false;

  const server = new SkillGitServer({ port, dataDir, token, verbose });

  process.on('SIGINT', () => {
    logger.info('\nShutting down server...');
    process.exit(0);
  });

  await server.start();
}

module.exports = cmdServer;
