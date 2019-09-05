/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const c = bedrock.util.config.main;
const cc = c.computer();
const config = bedrock.config;
const constants = config.constants;
const helpers = require('./helpers');
const path = require('path');
const os = require('os');
const permissions = config.permission.permissions;
const roles = config.permission.roles;

const cfg = config['ledger-test'] = {};

cfg.peers = [];

cfg.routes = {
  logFile: '/log/:logFile',
  mongoExpress: '/mongo',
};

cfg.dashboard = {
  host: config.server.domain
};

cfg.did = 'did:ledgertest:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59';

cfg.primaryBaseUrl = null;

cc('ledger-test.config', () => ({
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'WebLedgerConfiguration',
  ledger: config['ledger-test'].did,
  consensusMethod: 'Continuity2017',
  electorSelectionMethod: {
    type: 'MostRecentParticipants',
  },
  // ledgerConfigurationValidator: [],
  // operationValidator: [],
  sequence: 0
}));

config.paths.log = path.join(os.tmpdir(), 'bedrock-ledger-test');

// core configuration
config.core.workers = 0;
config.core.worker.restart = true;

// disable sessions server wide
config.express.useSession = false;

config.jsonld.strictSSL = false;

// logger config
config.loggers.app.tailable = true;
config.loggers.app.level = 'debug';
config.loggers.app.maxFiles = 1000;

// mongodb config
config.mongodb.name = 'ledger_test_primary';
config.mongodb.connectOptions.poolSize = 12;

// disable journaling
// config.mongodb.connectOptions.j = false;
// config.mongodb.writeOptions.j = false;

// enable consensus workers
config.ledger.jobs.scheduleConsensusWork.enabled = true;

// const cloudwatch = config.loggers.cloudwatch;
// cloudwatch.logGroupName = `primary-local`;
// cloudwatch.logStreamName = 'app';
// cloudwatch.json = true;
// cloudwatch.uploadRate = 20000;

const identities = config['ledger-test'].identities = {};

// identity with permission to add public keys
const userName = 'regularUser';
identities[userName] = {};
identities[userName].identity = helpers.createIdentity(userName);
identities[userName].meta = {
  sysResourceRole: [{
    sysRole: 'bedrock-ledger-test.test',
    generateResource: 'id'
  }]
};

roles['bedrock-ledger-test.test'] = {
  id: 'bedrock-ledger-test.test',
  label: 'Test Role',
  comment: 'Role for Test User',
  sysPermission: [
    permissions.LEDGER_NODE_ACCESS.id,
    permissions.LEDGER_NODE_CREATE.id,
    permissions.LEDGER_NODE_REMOVE.id,
    permissions.LEDGER_AGENT_ACCESS.id,
    permissions.LEDGER_AGENT_CREATE.id,
    permissions.LEDGER_AGENT_REMOVE.id
  ]
};

config['ledger-consensus-continuity'].consensus.workerpool.enabled = true;
config['ledger-consensus-continuity'].writer.debounce = 5000;

config['stats'].storage.push({name: 'redis'});
// generate stats reports at 1 minute intervals
config['stats'].report.interval = 60 * 1000;
