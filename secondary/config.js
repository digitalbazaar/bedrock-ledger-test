/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const config = bedrock.config;
const os = require('os');
const path = require('path');

config['ledger-test'] = {};

config['ledger-test'].primaryHost = 'ip-172-31-75-64.ec2.internal';
config['ledger-test'].primaryBaseUrl =
  `https://${config['ledger-test'].primaryHost}:18443/ledger-test`;

config['ledger-test'].routes = {
  logFile: '/log/:logFile',
  mongoExpress: '/mongo',
  ledgers: '/ledger-test/ledgers',
  blocks: '/ledger-test/nodes/:ledgerNodeId/blocks'
};

// interval to add new events (ms)
config['ledger-test'].eventInterval = 100;

config.paths.log = path.join(os.tmpdir(), 'bedrock-ledger-test');

// core configuration
config.core.workers = 0;
config.core.worker.restart = true;

// logger config
config.loggers.app.tailable = true;
config.loggers.app.level = 'debug';

// mongodb config
config.mongodb.name = 'ledger_test_secondary';

// enable consensus workers
config.ledger.jobs.scheduleConsensusWork.enabled = true;
