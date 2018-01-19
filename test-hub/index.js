/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const database = require('bedrock-mongodb');
let request = require('request');
request = request.defaults({json: true, strictSSL: false});
require('bedrock-ledger-context');
require('bedrock-express');
require('bedrock-webpack');
require('bedrock-views');
require('./server');

require('./config');

bedrock.events.on('bedrock-cli.init', () => bedrock.program.option(
  '--aws',
  'Configure for AWS.'
));

bedrock.events.on('bedrock-cli.parsed', callback => {
  if(bedrock.program.aws) {
    require('./config-aws');
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

bedrock.events.on('bedrock-mongodb.ready', callback => async.auto({
  open: callback => database.openCollections(['ledgerAgent'], callback),
  drop: ['open', (results, callback) =>
    database.collections.ledgerAgent.remove({}, callback)],
  openCollections: ['drop', (results, callback) => database.openCollections(
    ['ledgerAgent', 'testHub'], callback)],
  createIndexes: ['openCollections', (results, callback) =>
    database.createIndexes([{
      collection: 'ledgerAgent',
      fields: {id: 1},
      options: {unique: true, background: false}
    }], callback)]
}, err => callback(err)));

bedrock.start();
