/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const ledger = require('./ledger');
const logger = bedrock.loggers.get('app').child('ledger-test');
const randomPort = require('random-port');
const request = require('request');
const uuid = require('uuid/v4');
require('./ledger');
require('bedrock-express');
require('bedrock-ledger-consensus-continuity');
require('bedrock-ledger-node');
require('bedrock-ledger-storage-mongodb');
require('bedrock-letsencypt');
require('bedrock-mongodb');
require('./server');

require('./config');
const cfg = config['ledger-test'];

let publicIp;
let publicHostname;

bedrock.events.on('bedrock-cli.init', () => bedrock.program.option(
  '--aws',
  'Configure for AWS.'
));

bedrock.events.on('bedrock.configure', callback => {
  if(bedrock.program.aws) {
    require('./config-aws');
    const metaBase = 'http://169.254.169.254/latest/meta-data';
    const lhn = `${metaBase}/local-hostname/`;
    const phn = `${metaBase}/public-hostname/`;
    const pip = `${metaBase}/public-ipv4/`;
    return async.auto({
      lhn: callback => request.get(lhn, (err, res) => callback(err, res.body)),
      phn: callback => request.get(phn, (err, res) => callback(err, res.body)),
      pip: callback => request.get(pip, (err, res) => callback(err, res.body)),
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      config.server.httpPort = 80;
      config.server.port = 443;
      config.server.domain = results.phn;
      config.letsencrypt.domains [config.server.domain];
      publicHostname = results.phn;
      publicIp = results.pip;
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
        genesis: callback => request({
          method: 'GET',
          url: `${cfg.primaryBaseUrl}/genesis`,
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
        }],
        sendStatus: ['create', (results, callback) => request({
          body: {
            baseUri: config.server.baseUri,
            ledgerNodeId: results.create.id,
            privateHostname: config.server.domain,
            publicIp,
            publicHostname},
          method: 'POST',
          url: `${cfg.primaryBaseUrl}/nodes`,
          json: true,
          strictSSL: false
        }, callback)],
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

bedrock.events.on('bedrock-ledger-test.ready', (node, callback) => {
  bedrock.runOnce('ledger-test.addEventInterval', () => {
    setInterval(_addEvent, config['ledger-test'].eventInterval);
  }, callback);

  function _addEvent() {
    const event = {
      '@context': config.constants.WEB_LEDGER_CONTEXT_V1_URL,
      type: 'WebLedgerEvent',
      operation: 'Create',
      input: [{
        '@context': config.constants.TEST_CONTEXT_V1_URL,
        id: 'https://example.com/events/' + uuid(),
        type: 'Concert',
        name: publicIp,
        startDate: bedrock.util.w3cDate(),
        location: 'https://example.org/the-venue-austin',
        offers: {
          type: 'Offer',
          price: '13.00',
          priceCurrency: 'USD',
          url: `${config.server.baseUri}/purchase/${uuid()}`
        }
      }]
    };
    node.events.add(event, err => {
      if(err) {
        logger.error(err);
      }
    });
  }
});

bedrock.start();
