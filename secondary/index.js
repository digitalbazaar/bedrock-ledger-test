/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const cfg = config['ledger-test'];
const ledger = require('./ledger');
const logger = bedrock.loggers.get('app').child('ledger-test');
const randomPort = require('random-port');
const request = require('request');
const uuid = require('uuid/v4');
require('./ledger');
require('bedrock-ledger-consensus-continuity');
require('bedrock-ledger-node');
require('bedrock-ledger-storage-mongodb');
require('bedrock-mongodb');
require('bedrock-express');
require('./server');

require('./config');

let publicIp;
let publicHostname;

bedrock.events.on('bedrock-cli.init', () => bedrock.program.option(
  '--aws',
  'Configure for AWS.'
));

bedrock.events.on('bedrock.configure', callback => {
  if(bedrock.program.aws) {
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
      config.server.domain = results.lhn;
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
      return async.auto({
        sendStatus: callback => request({
          body: {baseUri: config.server.baseUri, publicIp, publicHostname},
          method: 'POST',
          url: `${cfg.primaryBaseUrl}/nodes`,
          json: true,
          strictSSL: false
        }, callback),
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
        }]
      }, callback);
    }
    // TODO: implement getting genesis
    request({
      body: {baseUri: config.server.baseUri, publicIp},
      method: 'POST',
      url: 'https://bedrock.local:18443/ledger-test/nodes',
      json: true,
      strictSSL: false
    }, callback);
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
