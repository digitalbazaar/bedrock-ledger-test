/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
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
require('./identities');
require('./ledger');
require('./server');

require('./config');

bedrock.events.on('bedrock-cli.init', () => bedrock.program
  .option('--aws', 'Configure for AWS.')
  .option('--baremetal', 'Configure for Bare Metal.')
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
    require('./config-baremetal');
  }
  config['ledger-test'].primaryBaseUrl = `${config.server.baseUri}/ledger-test`;
});

bedrock.start();
