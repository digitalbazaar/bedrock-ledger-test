/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const client = require('bedrock-ledger-test-client-http');
const config = bedrock.config;
const request = require('request');
const randomWords = require('random-words');
const scheduler = require('bedrock-jobs');
require('bedrock-express');
require('bedrock-ledger-agent');
require('bedrock-ledger-consensus-continuity');
require('bedrock-ledger-node');
require('bedrock-ledger-storage-mongodb');
require('bedrock-logger-cloudwatch');
require('bedrock-mongodb');
require('bedrock-permission');
require('bedrock-views');
require('bedrock-webpack');
require('./identities');
require('./server');
require('./stats');

require('./config');

let publicHostname;

bedrock.events.on('bedrock-cli.init', () => bedrock.program.option(
  '--aws',
  'Configure for AWS.'
));

bedrock.events.on('bedrock-cli.parsed', callback => {
  if(bedrock.program.aws) {
    require('./config-aws');
    const metaBase = 'http://169.254.169.254/latest/meta-data';
    const lhn = `${metaBase}/local-hostname/`;
    const phn = `${metaBase}/public-hostname/`;
    return async.auto({
      lhn: callback => request.get(lhn, (err, res) => callback(err, res.body)),
      phn: callback => request.get(phn, (err, res) => callback(err, res.body)),
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      config.loggers.cloudwatch.logGroupName =
        results.lhn.substring(0, results.lhn.indexOf('.'));
      config.server.domain = results.lhn;
      config['ledger-test'].primaryBaseUrl =
        `${config.server.baseUri}/ledger-test`;
      publicHostname = results.phn;
      callback();
    });
  }
  config['ledger-test'].primaryBaseUrl = `${config.server.baseUri}/ledger-test`;
  callback();
});

bedrock.events.on('bedrock-ledger-test.ready', (ledgerNode, callback) => {
  bedrock.runOnce('ledger-test.sendStatus', callback => {
    const label = `Primary-${randomWords()}`;
    scheduler.define('bedrock-ledger-test.sendStatus', _sendStatus);
    callback();
    function _sendStatus(job, callback) {
      client.sendStatus(
        {label, ledgerNodeId: ledgerNode.id, publicHostname}, callback);
    }
  }, callback);
});

bedrock.start();
