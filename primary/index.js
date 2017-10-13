/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const client = require('./client');
const config = bedrock.config;
const logger = require('./logger');
const request = require('request');
const uuid = require('uuid/v4');
require('bedrock-express');
require('bedrock-ledger-consensus-continuity');
require('bedrock-ledger-node');
require('bedrock-ledger-storage-mongodb');
require('bedrock-logger-cloudwatch');
require('bedrock-mongodb');
require('bedrock-views');
require('bedrock-webpack');
require('./server');
require('./stats');

require('./config');

let publicIp;
let publicHostname;

bedrock.events.on('bedrock-cli.init', () => bedrock.program.option(
  '--aws',
  'Configure for AWS.'
));

// Using cli.ready because it need to be before `configure` to be ahead
// of bedrock-letsencrypt
bedrock.events.on('bedrock-cli.ready', callback => {
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
      config.server.domain = results.lhn;
      config['ledger-test'].primaryBaseUrl =
        `${config.server.baseUri}/ledger-test`;
      publicHostname = results.phn;
      publicIp = results.pip;
      callback();
    });
  }
  config['ledger-test'].primaryBaseUrl =
    `${config.server.baseUri}/ledger-test`;
  callback();
});

bedrock.events.on('bedrock-ledger-test.ready', (ledgerNode, callback) => {
  bedrock.runOnce('ledger-test.addEventInterval', callback => {
    setInterval(_addEvent, config['ledger-test'].eventInterval);
    logger.debug(
      'Contacting Primary', {url: config['ledger-test'].primaryBaseUrl});
    client.sendStatus({
      ledgerNodeId: ledgerNode.id, publicIp, publicHostname
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
  }, callback);

  function _addEvent() {
    async.times(config['ledger-test'].eventNumber, (i, callback) => {
      const event = {
        '@context': config.constants.WEB_LEDGER_CONTEXT_V1_URL,
        type: 'WebLedgerEvent',
        operation: 'Create',
        input: [{
          '@context': config.constants.TEST_CONTEXT_V1_URL,
          id: `https://example.com/events/${uuid()}`,
          type: 'Concert',
          name: 'Primary Event',
          startDate: '2017-07-14T21:30',
          location: 'https://example.org/the-venue-new-york',
          offers: {
            type: 'Offer',
            price: '13.00',
            priceCurrency: 'USD',
            url: `${config.server.baseUri}/purchase/${uuid()}`
          }
        }]
      };
      ledgerNode.events.add(event, callback);
    });
  }
});

bedrock.start();
