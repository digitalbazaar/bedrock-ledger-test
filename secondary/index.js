/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const client = require('./client');
const ledger = require('./ledger');
const logger = require('./logger');
const randomPort = require('random-port');
const request = require('request');
const scheduler = require('bedrock-jobs');
require('./ledger');
require('bedrock-express');
require('bedrock-ledger-agent');
require('bedrock-ledger-consensus-continuity');
require('bedrock-ledger-node');
require('bedrock-ledger-storage-mongodb');
require('bedrock-logger-cloudwatch');
require('bedrock-mongodb');
require('bedrock-permission');
require('./identities');
require('./server');
require('./stats');

require('./config');
const cfg = config['ledger-test'];

let publicHostname;

bedrock.events.on('bedrock-cli.init', () => bedrock.program.option(
  '--aws',
  'Configure for AWS.'
));

bedrock.events.on('bedrock-cli.ready', callback => {
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
      publicHostname = results.phn;
      callback();
    });
  }
  // if running locally, just use a random port
  randomPort(port => {
    config.server.port = port;
    config.server.httpPort = port - 1;
    callback();
  });
});

bedrock.events.on('bedrock.started', callback =>
  bedrock.runOnce('bedrock-ledger-test.phoneHome', callback => {
    if(bedrock.program.aws) {
      logger.debug('Contacting Primary', {url: cfg.primaryBaseUrl});
      return async.auto({
        genesis: callback => client.getGenesis(callback),
        create: ['genesis', (results, callback) => {
          if(results.genesis.statusCode !== 200) {
            logger.debug('Error retrieving genesis block.', {
              statusCode: results.genesis.statusCode,
              error: results.genesis.body
            });
            return callback(new Error('Error retrieving genesis block.'));
          }
          ledger.create(results.genesis.body, callback);
        }],
        sendStatus: ['create', (results, callback) => {
          scheduler.define('bedrock-ledger-test.sendStatus', _sendStatus);
          callback();
          function _sendStatus(job, callback) {
            client.sendStatus(
              {ledgerNodeId: results.create.id, publicHostname}, callback);
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
    }
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
