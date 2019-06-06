/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

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

  // env currently set for scaleway, digitalocean, aws, azure
  let localIp = process.env.PUBLIC_IP;

  if(!localIp) {
    // this is for TestCloud
    const cloudMeta = require('/run/cloud-init/instance-data.json');
    localIp = cloudMeta.ds.ec2_metadata['local-ipv4'];
  }

  if(!localIp || typeof localIp !== 'string') {
    throw new Error('Could not acquire local IP information.');
  }
  config.server.domain = localIp;
};
