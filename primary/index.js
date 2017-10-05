/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const logger = bedrock.loggers.get('app').child('ledger-test');
const request = require('request');
const uuid = require('uuid/v4');
require('bedrock-ledger-consensus-continuity');
require('bedrock-ledger-node');
require('bedrock-ledger-storage-mongodb');
require('bedrock-mongodb');
require('bedrock-express');
require('./server');

require('./config');

bedrock.events.on('bedrock-cli.init', () => bedrock.program.option(
  '--aws',
  'Configure for AWS.'
));

bedrock.events.on('bedrock.configure', callback => {
  if(bedrock.program.aws) {
    const metaBase = 'http://169.254.169.254/latest/meta-data';
    const lhn = `${metaBase}/local-hostname/`;
    return async.auto({
      lhn: callback => request.get(lhn, (err, res) => callback(err, res.body)),
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      config.server.domain = results.lhn;
      callback();
    });
  }
  callback();
});

bedrock.events.on('bedrock-ledger-test.ready', node => {
  async.auto({
    genesis: callback => node.blocks.getGenesis(callback),
    secondary: ['genesis', (results, callback) => {
      // TODO: launch secondary nodes
      callback();
    }],
    events: callback => {
      setInterval(_addEvent, config['ledger-test'].eventInterval);
      callback();
    }
  });

  function _addEvent() {
    const event = {
      '@context': config.constants.WEB_LEDGER_CONTEXT_V1_URL,
      type: 'WebLedgerEvent',
      operation: 'Create',
      input: [{
        '@context': config.constants.TEST_CONTEXT_V1_URL,
        id: 'https://example.com/events/' + uuid(),
        type: 'Concert',
        name: 'Big Band Concert in New York City',
        startDate: '2017-07-14T21:30',
        location: 'https://example.org/the-venue-new-york',
        offers: {
          type: 'Offer',
          price: '13.00',
          priceCurrency: 'USD',
          url: 'https://www.ticketfly.com/purchase/' + uuid()
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
