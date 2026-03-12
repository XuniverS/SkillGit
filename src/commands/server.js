'use strict';

const SkillSyncServer = require('../server/server');
const logger = require('../utils/logger');

async function cmdServer(options) {
  const port = parseInt(options.port || process.env.SKILLSYNC_PORT || '3000', 10);
  const dataDir = options.dataDir || process.env.SKILLSYNC_DATA_DIR || './skillsync-data';
  const token = options.token || process.env.SKILLSYNC_TOKEN || '';
  const verbose = options.verbose || false;

  const server = new SkillSyncServer({ port, dataDir, token, verbose });

  process.on('SIGINT', () => {
    logger.info('\nShutting down server...');
    process.exit(0);
  });

  await server.start();
}

module.exports = cmdServer;
