/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const config = bedrock.config;
const path = require('path');

config['ledger-test'] = {};

config['ledger-test'].routes = {
  logFile: '/log',
  mongoExpress: '/mongo',
  newLedger: '/ledger-test/ledgers',
};

config['ledger-test'].did =
  'did:ledgertest:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59';

// interval to add new events (ms)
config['ledger-test'].eventInterval = 5000;

config.paths.log = path.join('/var', 'log', 'bedrock-ledger-test');

// core configuration
config.core.workers = 1;
config.core.worker.restart = true;

// mongodb config
config.mongodb.name = 'ledger_test_secondary';

// enable consensus workers
config.ledger.jobs.scheduleConsensusWork.enabled = true;
