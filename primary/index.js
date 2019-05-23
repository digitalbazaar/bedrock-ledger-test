/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config} = bedrock;
require('bedrock-express');
require('bedrock-ledger-agent');
require('bedrock-ledger-consensus-continuity');
require('bedrock-ledger-consensus-continuity-es-most-recent-participants');
require('bedrock-ledger-consensus-continuity-es-most-recent-participants-' +
  'with-recovery');
require('bedrock-ledger-node');
require('bedrock-ledger-storage-mongodb');
// require('bedrock-logger-cloudwatch');
require('bedrock-mongodb');
require('bedrock-permission');
require('bedrock-views');

// stats modules
require('bedrock-package-manager');
require('bedrock-stats');
require('bedrock-stats-http');
require('bedrock-stats-monitor-os');
require('bedrock-stats-storage-redis');
require('bedrock-ledger-node-stats-monitor');
require('bedrock-ledger-consensus-continuity-stats-monitor');
require('./stats');

require('./identities');
require('./ledger');
require('./server');

require('./config');

bedrock.events.on('bedrock-cli.init', () => bedrock.program
  .option('--aws', 'Configure for AWS.')
  .option('--baremetal', 'Configure for Bare Metal.')
  .option('--docker', 'Configure for Docker.')
);

bedrock.events.on('bedrock-cli.ready', async () => {
  if(bedrock.program.aws) {
    require('./config-aws');
    // this lives here instead of the config due to async functions
    const awsInstanceMetadata = require('aws-instance-metadata');
    const localIp = await awsInstanceMetadata.fetch('local-ipv4');
    // const publicIp = await awsInstanceMetadata.fetch('public-ipv4');
    // config.loggers.cloudwatch.logGroupName =
    //   results.lhn.substring(0, results.lhn.indexOf('.'));
    // config.server.domain = results.lhn;
    config.server.bindAddr = [localIp];
    config.server.domain = localIp;
  }
  if(bedrock.program.baremetal) {
    const {configure} = require('./config-baremetal');
    await configure();
  }
  if(bedrock.program.docker) {
    const {configure} = require('./config-docker');
    await configure();
  }
  config['ledger-test'].primaryBaseUrl = `${config.server.baseUri}/ledger-test`;
});

bedrock.start();
