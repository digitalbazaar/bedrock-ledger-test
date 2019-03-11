/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config, util: {uuid}} = bedrock;
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
// core configuration
config.core.workers = 0;

config.mongodb.host = instanceConfig['mongo-hostname'] || 'localhost';
config.mongodb.name = instanceConfig['mongo-dbname'] || uuid();

// if primary is defined in the instance config, this is a secondary that
// should contact the primary for the genesis block
if(instanceConfig['primary-hostname']) {
  config['ledger-test'].peers.push(instanceConfig['primary-hostname']);
}
