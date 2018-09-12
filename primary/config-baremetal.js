/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config} = bedrock;
const fs = require('fs');
const ifaces = require('os').networkInterfaces();
const path = require('path');
const yaml = require('js-yaml');

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

config['ledger-test'].dashboard.host = instanceConfig['dashboard-hostname'];

config.mongodb.host = instanceConfig['mongo-hostname'];
config.mongodb.name = instanceConfig['mongo-dbname'];

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
      config.server.domain = iface.address;
    }
    ++alias;
  });
});
