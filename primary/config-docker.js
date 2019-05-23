/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const awsInstanceMetadata = require('aws-instance-metadata');
const bedrock = require('bedrock');
const {config, util: {uuid}} = bedrock;

exports.configure = async () => {
  // core configuration
  config.core.workers = 0;

  config.mongodb.host = 'mongo-docker';
  config.mongodb.name = uuid();

  // if primary is defined in the instance config, this is a secondary that
  // should contact the primary for the genesis block

  // FIXME: this should use process.env
  // if(instanceConfig['primary-hostname']) {
  //   config['ledger-test'].peers.push(instanceConfig['primary-hostname']);
  // }

  config.server.bindAddr = ['0.0.0.0'];
  const localIp = await awsInstanceMetadata.fetch('local-ipv4');
  console.log('LLLLLLLLLL LOCAL IP', localIp);
  config.server.domain = localIp;

};
