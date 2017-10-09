/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const logger = require('./logger');
const request = require('request');

const api = {};
module.exports = api;

api.getGenesis = callback => request({
  method: 'GET',
  url: `${config['ledger-test'].primaryBaseUrl}/genesis`,
  json: true,
  strictSSL: false
}, (err, res) => callback(err, res));

api.sendStatus = (options, callback) => {
  logger.debug('Sending status.', {url: config['ledger-test'].primaryBaseUrl});
  return async.auto({
    sendStatus: callback => request({
      body: {
        baseUri: config.server.baseUri,
        label: 'Secondary',
        ledgerNodeId: options.ledgerNodeId,
        privateHostname: config.server.domain,
        publicIp: options.publicIp,
        publicHostname: options.publicHostname
      },
      method: 'POST',
      url: `${config['ledger-test'].primaryBaseUrl}/nodes`,
      json: true,
      strictSSL: false
    }, callback),
  }, err => callback(err));
};
