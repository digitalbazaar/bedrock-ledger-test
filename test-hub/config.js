/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const config = bedrock.config;
const os = require('os');
const path = require('path');

config.server.port = 18443;
config.server.httpPort = 18080;
config.server.domain = '10.0.0.28';

// mongodb config
config.mongodb.name = 'bedrock_test_hub';

config['test-hub'] = {};

config['test-hub'].routes = {
  testHub: `/test-hub`,
};

config.paths.log = path.join(os.tmpdir(), 'bedrock-ledger-test');

// core configuration
config.core.workers = 1;
config.core.worker.restart = true;

// logger config
config.loggers.app.tailable = true;
config.loggers.app.level = 'debug';

// add pseudo packages
const rootPath = path.join(__dirname);
config.views.system.packages.push({
  path: path.join(rootPath, 'components'),
  manifest: path.join(rootPath, 'package.json')
});
