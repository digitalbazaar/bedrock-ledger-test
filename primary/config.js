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
  newNode: '/ledger-test/nodes',
};

config['ledger-test'].did =
  'did:ledgertest:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59';

// interval to add new events (ms)
config['ledger-test'].eventInterval = 5000;

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
config.core.workers = 0;
config.core.worker.restart = true;

// mongodb config
config.mongodb.name = 'ledger_test_primary';

// enable consensus workers
config.ledger.jobs.scheduleConsensusWork.enabled = true;
