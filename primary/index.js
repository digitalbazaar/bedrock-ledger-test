/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const logger = require('./logger');
const request = require('request');
const uuid = require('uuid/v4');
require('bedrock-express');
require('bedrock-ledger-consensus-continuity');
require('bedrock-ledger-node');
require('bedrock-ledger-storage-mongodb');
require('bedrock-letsencrypt');
require('bedrock-mongodb');
require('bedrock-views');
require('bedrock-webpack');
require('./server');

require('./config');

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
    return async.auto({
      lhn: callback => request.get(lhn, (err, res) => callback(err, res.body)),
      phn: callback => request.get(phn, (err, res) => callback(err, res.body)),
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      config.server.httpPort = 80;
      config.server.port = 443;
      config.server.domain = results.phn;
      config.letsencrypt.domains = [config.server.domain];
      config.letsencrypt.email = `mcollier@digitalbazaar.com`;
      config.letsencrypt.mode = 'production';
      callback();
    });
  }
  callback();
});

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
    node.events.add(event, err => {
      if(err) {
        logger.error(err);
      }
    });
  }
});

bedrock.start();
