/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const ledger = require('./ledger');
let request = require('request');
request = request.defaults({json: true, strictSSL: false});

// module API
const api = {};
module.exports = api;

api.addLedger = (baseUri, callback) => {
  const url = `${baseUri}/ledger-test/ledgers`;
  async.auto({
    genesis: callback => ledger.agent.node.blocks.getGenesis(callback),
    post: ['genesis', (results, callback) => {
      request.post({
        url,
        json: results.genesis.genesisBlock.block
      }, (err, res) => callback(err, {
        statusCode: res.statusCode,
        body: res.body
      }));
    }]
  }, (err, results) => callback(err, results.post));
};
