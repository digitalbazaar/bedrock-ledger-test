/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const client = require('bedrock-ledger-test-client-http');
const config = bedrock.config;
const randomWords = require('random-words');
const scheduler = require('bedrock-jobs');
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
require('./server');

// stats logger is only useful when using CloudWatch which is currently disabled
// require('./stats');

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
    const publicIp = await awsInstanceMetadata.fetch('public-ipv4');
    // config.loggers.cloudwatch.logGroupName =
    //   results.lhn.substring(0, results.lhn.indexOf('.'));
    // config.server.domain = results.lhn;
    console.log('AAAAAAAAAAA', localIp);
    console.log('BBBBBBBBBBB', localIp);
    config.server.bindAddr = [localIp];
    config.server.domain = publicIp;
  }
  if(bedrock.program.baremetal) {
    require('./config-baremetal');
  }
  config['ledger-test'].primaryBaseUrl = `${config.server.baseUri}/ledger-test`;
});

bedrock.events.on('bedrock-ledger-test.ready', (ledgerNode, callback) => {
  bedrock.runOnce('ledger-test.sendStatus', callback => {
    const label = `Primary-${randomWords()}`;
    const {host: dashboardHostname} = config['ledger-test'].dashboard;
    const publicHostname = config.server.domain;
    scheduler.define('bedrock-ledger-test.sendStatus', _sendStatus);
    callback();
    function _sendStatus(job, callback) {
      client.sendStatus({
        dashboardHostname, label, ledgerNodeId: ledgerNode.id, publicHostname
      }, callback);
    }
  }, callback);
});

bedrock.start();
