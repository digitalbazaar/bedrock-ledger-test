/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';
const async = require('async');
const constants = require('bedrock').config.constants;
let request = require('request');
request = request.defaults({json: true, strictSSL: false});
const helpers = require('./helpers');
const uuid = require('uuid/v4');
require('bedrock-ledger-context');

// a simple worker for use in node.js (as a child process)

// load workerpool
const workerpool = require('workerpool');

function sendEvent({eventService, eventNum, actor}) {
  async.timesLimit(eventNum, 100, (i, callback) => {
    const event = {
      '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
      type: 'WebLedgerEvent',
      operation: 'Create',
      input: [{
        '@context': constants.TEST_CONTEXT_V1_URL,
        id: `https://example.com/events/123`,
        type: 'Concert',
        name: 'Primary Event',
        startDate: '2017-07-14T21:30',
        location: 'https://example.org/the-venue-new-york',
        offers: {
          type: 'Offer',
          price: '13.00',
          priceCurrency: 'USD',
          url: `https://example.com/purchase/${uuid()}`
        }
      }]
    };
    request.post(helpers.createHttpSignatureRequest({
      url: eventService,
      body: event,
      identity: actor
    }), (err, res) => {
      if(err) {
        console.error(err);
        return callback(err);
      }
      if(res.statusCode !== 201) {
        err = new Error(
          'Error sending event: server did not respond with 201.');
        console.error(err);
        return callback(err);
      }
    });
  });
}

// create a worker and register public functions
workerpool.worker({sendEvent});
