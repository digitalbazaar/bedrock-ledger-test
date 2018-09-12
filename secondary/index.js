/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const {config} = bedrock;
const client = require('bedrock-ledger-test-client-http');
const ledger = require('./ledger');
const logger = require('./logger');
const {promisify} = require('util');
const randomPort = require('random-port');
const randomWords = require('random-words');
const request = require('request');
const scheduler = require('bedrock-jobs');
require('./ledger');
require('bedrock-express');
require('bedrock-ledger-agent');
require('bedrock-ledger-consensus-continuity');
require('bedrock-ledger-node');
require('bedrock-ledger-storage-mongodb');
// require('bedrock-logger-cloudwatch');
require('bedrock-mongodb');
require('bedrock-permission');
require('./identities');
require('./server');

require('./config');
const cfg = config['ledger-test'];

bedrock.events.on('bedrock-cli.init', () => bedrock.program
  .option('--aws', 'Configure for AWS.')
  .option('--baremetal', 'Configure for Bare Metal.')
  .option('--localpeer', 'Configure for local peer to OpenStack Primary.')
);

bedrock.events.on('bedrock-cli.ready', async () => {
  if(bedrock.program.baremetal) {
    require('./config-baremetal');
    return;
  }
  if(bedrock.program.localpeer) {
    require('./config-localpeer');
    return;
  }
  if(bedrock.program.aws) {
    require('./config-aws');
    // NOTE: this is not in the config due to async functions
    const awsInstanceMetadata = require('aws-instance-metadata');
    const localIp = await awsInstanceMetadata.fetch('local-ipv4');
    const publicIp = await awsInstanceMetadata.fetch('public-ipv4');
    // config.loggers.cloudwatch.logGroupName =
    //   results.lhn.substring(0, results.lhn.indexOf('.'));
    config.server.bindAddr = [localIp];
    config.server.domain = publicIp;
    return;
  }
  // if running locally, just use a random port
  await promisify(randomPort)(port => {
    config.server.port = port;
    config.server.httpPort = port - 1;
  });
});

bedrock.events.on('bedrock.started', callback =>
  bedrock.runOnce('bedrock-ledger-test.phoneHome', callback => {

    if(bedrock.program.aws || bedrock.program.localpeer) {
      logger.debug('Contacting Primary', {url: cfg.primaryBaseUrl});
      return async.auto({
        genesis: callback => async.retry(
          {times: 300, interval: 5000}, callback =>
            client.getGenesis(callback), callback),
        create: ['genesis', (results, callback) => {
          ledger.create(results.genesis, callback);
        }],
        sendStatus: ['create', (results, callback) => {
          const label = `Secondary-${randomWords()}`;
          const {host: dashboardHostname} = config['ledger-test'].dashboard;
          const publicHostname = config.server.domain;
          scheduler.define('bedrock-ledger-test.sendStatus', _sendStatus);
          callback();
          function _sendStatus(job, callback) {
            client.sendStatus({
              dashboardHostname, label, ledgerNodeId: results.create.id,
              publicHostname
            }, callback);
          }
        }]
      }, err => {
        if(err) {
          logger.debug('Error communicating with primary.', {
            error: err.toString()
          });
          return callback(err);
        }
        logger.debug('Communication with primary successul.');
        callback();
      });
    } // end aws

    logger.debug('Contacting Primary', {
      url: 'https://bedrock.local:18443/ledger-test'
    });
    return async.auto({
      sendStatus: callback => request({
        body: {baseUri: config.server.baseUri},
        method: 'POST',
        url: `https://bedrock.local:18443/ledger-test/nodes`,
        json: true,
        strictSSL: false
      }, callback),
      genesis: callback => request({
        method: 'GET',
        url: `https://bedrock.local:18443/ledger-test/genesis`,
        json: true,
        strictSSL: false
      }, (err, res) => callback(err, res)),
      create: ['genesis', (results, callback) => {
        if(results.genesis.statusCode !== 200) {
          logger.debug('Error retrieving genesis block.', {
            statusCode: results.genesis.statusCode,
            error: results.genesis.body
          });
          return callback(new Error('Error retrieving genesis block.'));
        }
        ledger.create(results.genesis.body, callback);
      }]
    }, err => {
      if(err) {
        logger.debug('Error communicating with primary.', {
          error: err.toString()
        });
        return callback(err);
      }
      logger.debug('Communication with primary successul.');
      callback();
    });
  }, callback));

bedrock.start();
