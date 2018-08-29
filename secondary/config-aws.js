/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const config = bedrock.config;
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

let instanceConfig;
try {
  instanceConfig = yaml.safeLoad(fs.readFileSync(
    path.join(process.cwd(), 'instance-config.yml'), 'utf8'));
} catch(err) {
  console.log('CONFIGURATION ERROR', err);
  throw err;
}

config.server.port = 18443;
config.server.httpPort = 18080;

// core configuration
config.core.workers = 0;

config['ledger-test'].dashboard.host = instanceConfig['dashboard-hostname'];

config['ledger-test'].primaryHost = instanceConfig['primary-hostname'];

config.mongodb.host = instanceConfig['mongo-hostname'];
config.mongodb.name = instanceConfig['mongo-dbname'];
