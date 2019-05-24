/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const awsInstanceMetadata = require('aws-instance-metadata');
const bedrock = require('bedrock');
const {config} = bedrock;

exports.configure = async () => {
  // core configuration
  config.core.workers = 0;

  config.mongodb.host = 'mongo-docker';
  config.mongodb.name = 'bedrock-ledger-test';

  config.redis.host = 'redis-docker';
  config.jobs.queueOptions.redis.host = config.redis.host;

  // if primary is defined in the instance config, this is a secondary that
  // should contact the primary for the genesis block

  if(process.env.PRIMARY_HOSTNAME) {
    config['ledger-test'].peers.push(process.env.PRIMARY_HOSTNAME);
  }

  config.server.bindAddr = ['0.0.0.0'];

  // this works on AWS and OpenStack
  const localIp = await awsInstanceMetadata.fetch('local-ipv4');
  config.server.domain = localIp;

};
