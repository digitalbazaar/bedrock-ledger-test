/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const cc = bedrock.util.config.main.computer();
const config = bedrock.config;
const constants = config.constants;
const path = require('path');
const os = require('os');

config['ledger-test'] = {};

config['ledger-test'].routes = {
  logFile: '/log/:logFile',
  mongoExpress: '/mongo',
  genesis: '/ledger-test/genesis',
  blocks: '/ledger-test/nodes/:ledgerNodeId/blocks',
  newNode: '/ledger-test/nodes',
  peers: '/ledger-test/peers'
};

config['ledger-test'].did =
  'did:ledgertest:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59';

// interval to add new events (ms)
config['ledger-test'].eventInterval = 500;
// number of events to add at each interval
config['ledger-test'].eventNumber = 5;

config['ledger-test'].primaryBaseUrl = null;

cc('ledger-test.config', () => ({
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'WebLedgerConfigurationEvent',
  ledgerConfiguration: {
    type: 'WebLedgerConfiguration',
    ledger: config['ledger-test'].did,
    consensusMethod: 'Continuity2017',
    eventValidator: [],
    // electorCount: 20
  }
}));

config.paths.log = path.join(os.tmpdir(), 'bedrock-ledger-test');

// core configuration
config.core.workers = 1;
config.core.worker.restart = true;

// logger config
config.loggers.app.tailable = true;
config.loggers.app.level = 'debug';

// mongodb config
config.mongodb.name = 'ledger_test_primary';

// enable consensus workers
config.ledger.jobs.scheduleConsensusWork.enabled = true;

// add pseudo packages
const rootPath = path.join(__dirname, '..');
config.views.system.packages.push({
  path: path.join(rootPath, 'primary', 'components'),
  manifest: path.join(rootPath, 'package.json')
});

const cloudwatch = config.loggers.cloudwatch;
cloudwatch.logGroupName = 'ledger-node-collier';
cloudwatch.logStreamName = 'app';
