/*
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';
const async = require('async');
const constants = require('bedrock').config.constants;
let request = require('request');
request = request.defaults({
  json: true, strictSSL: false, pool: {maxSockets: 250}
});
const helpers = require('./helpers');
const uuid = require('uuid/v4');
require('bedrock-ledger-context');

// a simple worker for use in node.js (as a child process)

// load workerpool
const workerpool = require('workerpool');

function sendEvent({ledgerOperationService, eventNum, actor}) {
  async.timesLimit(eventNum, 250, (i, callback) => {
    const operation = {
      '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
      type: 'CreateWebLedgerRecord',
      record: {
        '@context': {'@vocab': 'https://w3id.org/payments#'},
        '@id': `https://example.com/transaction/${uuid()}`,
        sourceAccount: Math.floor(Math.random() * 100000000000),
        destinationAccount: Math.floor(Math.random() * 1000000000000),
        memo: `Transaction ${Math.floor(Math.random() * 1000000000000)}`,
        proof: {
          type: 'Ed25519Signature2018',
          created: '2018-02-19T14:48:48Z',
          creator: 'did:v1:test:nym:8IyxSpzUFcby2pe_oSdsbjb_1hLjo0eqaQSNRPrpUxw#ocap-invoke-key-1',
          capability: 'did:v1:test:nym:8IyxSpzUFcby2pe_oSdsbjb_1hLjo0eqaQSNRPrpUxw',
          capabilityAction: 'transact',
          jws: 'eyJhbGciOiJSUzI1NiIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..u-alElcqe_xri6GLL10Ozi1LwLO9HpUXmsRqnjTa7jhAf1pFbAjdGDNhDjg0QvCIw',
          proofPurpose: 'invokeCapability'
        }
      },
      proof: {
        type: 'Ed25519Signature2018',
        created: '2018-02-19T14:48:48Z',
        creator: 'did:v1:test:nym:8IyxSpzUFcby2pe_oSdsbjb_1hLjo0eqaQSNRPrpUxw#ocap-invoke-key-1',
        capability: 'did:v1:test:nym:8IyxSpzUFcby2pe_oSdsbjb_1hLjo0eqaQSNRPrpUxw',
        capabilityAction: 'CreateWebLedgerRecord',
        jws: 'eyJhbGciOiJSUzI1NiIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..u-alElcqe_xri6GLL10Ozi1LwLO9HpUXmsRqnjTa7jhAf1pFbAjdGDNhDjg0QvCIw',
        proofPurpose: 'invokeCapability'
      }
    };
    request.post(helpers.createHttpSignatureRequest({
      url: ledgerOperationService,
      body: operation,
      identity: actor
    }), (err, res) => {
      if(err) {
        console.error(err);
        return callback(err);
      }
      if(res.statusCode !== 204) {
        err = new Error(
          'Error sending event: server did not respond with 204.');
        console.error('ERROR', err);
        console.error('statusCode', res.statusCode);
        console.error('body', res.body);
        return callback(err);
      }
    });
  });
}

// create a worker and register public functions
workerpool.worker({sendEvent});
