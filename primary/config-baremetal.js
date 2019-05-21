/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config, util: {uuid}} = bedrock;
const fs = require('fs');
const ifaces = require('os').networkInterfaces();
const path = require('path');
const yaml = require('js-yaml');

exports.configure = async () => {
  let instanceConfig;
  try {
    instanceConfig = yaml.safeLoad(fs.readFileSync(
      path.join(process.cwd(), 'instance-config.yml'), 'utf8'));
  } catch(err) {
    console.log('CONFIGURATION ERROR', err);
    throw err;
  }
  // core configuration
  config.core.workers = 0;

  config.mongodb.host = instanceConfig['mongo-hostname'] || 'localhost';
  config.mongodb.name = instanceConfig['mongo-dbname'] || uuid();

  // if primary is defined in the instance config, this is a secondary that
  // should contact the primary for the genesis block
  if(instanceConfig['primary-hostname']) {
    config['ledger-test'].peers.push(instanceConfig['primary-hostname']);
  }

  const publicIp = await _getPublicIp();

  Object.keys(ifaces).forEach(ifname => {
    let alias = 0;

    ifaces[ifname].forEach(iface => {
      if('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }

      if(alias >= 1) {
        // this single interface has multiple ipv4 addresses
        // console.log(ifname + ':' + alias, iface.address);
      } else {
        // this interface has only one ipv4 adress
        // console.log(ifname, iface.address);
        // FIXME: this algo can get confused by VPN `tun` interfaces
        config.server.bindAddr = [iface.address];
        // config.server.domain = iface.address;
        config.server.domain = publicIp;
      }
      ++alias;
    });
  });
};

async function _getPublicIp() {
  const util = require('util');
  const exec = util.promisify(require('child_process').exec);
  // scw-metadata is a command line util provided on scaleway instances
  const {stdout} = await exec('scw-metadata --cached PUBLIC_IP_ADDRESS');
  return stdout.trim();
}
