/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
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

bedrock.events.on('bedrock-cli.init', () => bedrock.program.option(
  '--aws',
  'Configure for AWS.'
));

bedrock.events.on('bedrock.configure', callback => {
  if(bedrock.program.aws) {
    const metaBase = 'http://169.254.169.254/latest/meta-data';
    const lhn = `${metaBase}/local-hostname/`;
    const lip = `${metaBase}/local-ipv4/`;
    const pip = `${metaBase}/public-ipv4/`;
    return async.auto({
      lhn: callback => request.get(lhn, (err, res) => callback(err, res.body)),
      // lip: callback => request.get(lip, (err, res) => callback(err, res.body)),
      pip: callback => request.get(pip, (err, res) => callback(err, res.body)),
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      config.server.domain = results.lhn;
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

bedrock.events.on('bedrock.started', () => request({
  body: {baseUri: config.server.baseUri, publicIp},
  method: 'POST',
  url: 'https://ip-172-31-71-247.ec2.internal:18443/ledger-test/nodes',
  json: true,
  strictSSL: false
}));

bedrock.events.on('bedrock-ledger-test.ready', node => {

  setInterval(_addEvent, config['ledger-test'].eventInterval);

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
