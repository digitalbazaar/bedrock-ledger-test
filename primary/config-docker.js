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

  let localIp;
  try {
    // this works on TestCloud
    // localIp = await awsInstanceMetadata.fetch('local-ipv4');

    // this works on AWS
    localIp = await awsInstanceMetadata.fetch('public-ipv4');
  } catch(e) {
    // ignore error
  }
  if(!localIp) {
    try {
      // try DigitalOcean api
      const {create} = require('apisauce');
      const baseURL = 'http://169.254.169.254/metadata/v1';
      const doApi = create({baseURL, timeout: 30000});
      ({data: localIp} = await doApi.get('/interfaces/public/0/ipv4/address'));
    } catch(e) {
      // ignore error
    }
  }
  if(!localIp) {
    // try Azure
    const {create} = require('apisauce');
    const baseURL = 'http://169.254.169.254/metadata/instance';
    const azureApi = create({baseURL, timeout: 30000, headers: {
      Metadata: true
    }});
    ({data: localIp} = await azureApi.get(
      '/network/interface/0/ipv4/ipAddress/0/publicIpAddress', {
        'api-version': '2017-08-01',
        format: 'text',
      }
    ));
  }
  if(!localIp) {
    throw new Error('Could not acquire local IP information.');
  }
  config.server.domain = localIp;
};
