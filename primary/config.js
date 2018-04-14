/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const c = bedrock.util.config.main;
const cc = c.computer();
const config = bedrock.config;
const constants = config.constants;
const helpers = require('./helpers');
const path = require('path');
const os = require('os');
const permissions = config.permission.permissions;
const roles = config.permission.roles;

config['ledger-test'] = {};

config['ledger-test'].routes = {
  logFile: '/log/:logFile',
  mongoExpress: '/mongo',
  genesis: '/ledger-test/genesis',
  blocks: '/ledger-test/nodes/:ledgerNodeId/blocks',
  newNode: '/ledger-test/nodes',
  peers: '/ledger-test/peers',
  peerHistory: '/ledger-test/peers/:peerId',
};

// c.pushComputed('scheduler.jobs', () => ({
//   id: `bedrock-ledger-test.stats.logStats`,
//   type: `bedrock-ledger-test.stats.logStats`,
//   // repeat forever, run every second
//   schedule: 'R/PT1M',
//   // no special priority
//   priority: 0,
//   concurrency: 1,
//   // use a 10000ms grace period between TTL for workers to finish up
//   // before forcibly running another worker
//   // lockDuration: config.ledger.jobs.scheduleConsensusWork.ttl + 10000
// }));
c.pushComputed('scheduler.jobs', () => ({
  id: `bedrock-ledger-test.sendStatus`,
  type: `bedrock-ledger-test.sendStatus`,
  // repeat forever, run every second
  schedule: 'R/PT1M',
  // no special priority
  priority: 0,
  concurrency: 1,
  // use a 10000ms grace period between TTL for workers to finish up
  // before forcibly running another worker
  // lockDuration: config.ledger.jobs.scheduleConsensusWork.ttl + 10000
}));

config['ledger-test'].did =
  'did:ledgertest:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59';

config['ledger-test'].primaryBaseUrl = null;

cc('ledger-test.config', () => ({
  '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
  type: 'WebLedgerConfiguration',
  ledger: config['ledger-test'].did,
  consensusMethod: 'Continuity2017',
  ledgerConfigurationValidator: [],
  operationValidator: [],
}));

config.paths.log = path.join(os.tmpdir(), 'bedrock-ledger-test');

// core configuration
config.core.workers = 0;
config.core.worker.restart = true;

// enable cache for public keys
config.key.cache.enable = true;

// logger config
config.loggers.app.tailable = true;
config.loggers.app.level = 'debug';

// mongodb config
config.mongodb.name = 'ledger_test_primary';
config.mongodb.connectOptions.poolSize = 12;

// enable consensus workers
config.ledger.jobs.scheduleConsensusWork.enabled = true;

// add pseudo packages
const rootPath = path.join(__dirname, '..');
config.views.system.packages.push({
  path: path.join(rootPath, 'primary', 'components'),
  manifest: path.join(rootPath, 'package.json')
});
config.views.vars.minify = false;

const cloudwatch = config.loggers.cloudwatch;
cloudwatch.logGroupName = `primary-local`;
cloudwatch.logStreamName = 'app';
cloudwatch.json = true;
cloudwatch.uploadRate = 20000;

const identities = config['ledger-test'].identities = {};

// identity with permission to add public keys
const userName = 'regularUser';
identities[userName] = {};
identities[userName].identity = helpers.createIdentity(userName);
identities[userName].identity.sysResourceRole.push({
  sysRole: 'bedrock-ledger-test.test',
  generateResource: 'id'
});
identities[userName].keys = helpers.createKeyPair({
  userName: userName,
  userId: identities[userName].identity.id,
  publicKey: '-----BEGIN PUBLIC KEY-----\n' +
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqv8gApfU3FhZx1gyKmBU\n' +
    'czZ1Ba3DQbqcGRJiwWz6wrr9E/K0PcpRws/+GPc1znG4cKLdxkdyA2zROUt/lbaM\n' +
    'TU+/kZzRh3ICZZOuo8kJpGqxPDIm7L1lIcBLOWu/UEV2VaWNOENwiQbh61VJlR+k\n' +
    'HK9LhQxYYZT554MYaXzcSRTC/RzHDTAocf+B1go8tawPEixgs93+HHXoLPGypmqn\n' +
    'lBKAjmGMwizbWFccDQqv0yZfAFpdVY2MNKlDSUNMnZyUgBZNpGOGPm9zi9aMFT2d\n' +
    'DrN9fpWMdu0QeZrJrDHzk6TKwtKrBB9xNMuHGYdPxy8Ix0uNmUt0mqt6H5Vhl4O0\n' +
    '0QIDAQAB\n' +
    '-----END PUBLIC KEY-----\n',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\n' +
    'MIIEpQIBAAKCAQEAqv8gApfU3FhZx1gyKmBUczZ1Ba3DQbqcGRJiwWz6wrr9E/K0\n' +
    'PcpRws/+GPc1znG4cKLdxkdyA2zROUt/lbaMTU+/kZzRh3ICZZOuo8kJpGqxPDIm\n' +
    '7L1lIcBLOWu/UEV2VaWNOENwiQbh61VJlR+kHK9LhQxYYZT554MYaXzcSRTC/RzH\n' +
    'DTAocf+B1go8tawPEixgs93+HHXoLPGypmqnlBKAjmGMwizbWFccDQqv0yZfAFpd\n' +
    'VY2MNKlDSUNMnZyUgBZNpGOGPm9zi9aMFT2dDrN9fpWMdu0QeZrJrDHzk6TKwtKr\n' +
    'BB9xNMuHGYdPxy8Ix0uNmUt0mqt6H5Vhl4O00QIDAQABAoIBAQCpA3yXM42AsY8j\n' +
    'mwgSnJ48NqJaF5L8P7+UhHi6KMZ+fSYydl0zCevge4bzFD3JrNuZ8VD1b57AxejT\n' +
    'Ec2so/9vVxjJi1AK6WR3FA608rumGJLQJd4Vd2ojfxabTeWOKOo642R/LSFpPzVE\n' +
    'T0toqxqiA53IhxhAc2jDLO+PLIvrao0Y8bWWq36tbxsAplrv8Gms6ZRwfKoX5P32\n' +
    'azBpJOqneNdSMRPHky6t2uiYyuPeG9pbuaClkD7Ss9lpH0V1DLQmAAlP9I0Aa06B\n' +
    'a9zPFPb3Ae8F0HO/tsf8gIvrlT38JvLe5VuCS7/LQNCZguyPZuZOXLDmdETfm1FD\n' +
    'q56rCV7VAoGBANmQ7EqDfxmUygTXlqaCQqNzY5pYKItM6RFHc9I+ADBWsLbuKtfP\n' +
    'XUMHQx6PvwCMBpjZkM7doGdzOHb0l3rW8zQONayqQxN9Pjd7K+dkSY6k0SScw46w\n' +
    '0AexDQSM/0ahVAHfXXi1GbKwlonM0nn/7JHz7n/fL9HwV8T3hAGClbPDAoGBAMk0\n' +
    'K5d+Ov55sKW0ZatZ0vTnfBCSrVEfG6FkcyK7uiSsMdWo2/De0VtJF7od2DM5UyP6\n' +
    'Y/DSVk4oPepbug5oGdu8t1Q3jbS61A7i/dssirQC4hEFAtoTGsVfaH8wu4AKyWd7\n' +
    '0rUmSrnyqNr4mfQBjdaXByvWO9rdEfZcZqaSQ4/bAoGAKy/CR7Q8eYZ4Z2eoBtta\n' +
    'gPl5rvyK58PXi8+EJRqbjPzYTSePp5EI8TIy15EvF9uzv4mIXhfOLFrJvYsluoOK\n' +
    'eS3M575QXEEDJZ40g9T7aO48eakIhH2CfdReQiX+0jVZ6Jk/A6PnOvokl6vpp7/u\n' +
    'ZLZoBEf4RRMRSQ7czDPwpWMCgYEAlNWZtWuz+hBMgpcqahF9AprF5ICL4qkvSDjF\n' +
    'Dpltfbk+9/z8DXbVyUANZCi1iFbMUJ3lFfyRySjtfBI0VHnfPvOfbZXWpi1ZtlVl\n' +
    'UZ7mT3ief9aEIIrnT79ezk9fM71G9NzcphHYTyrYi3pAcAZCRM3diSjlh+XmZqY9\n' +
    'bNRfU+cCgYEAoBYwp0PJ1QEp3lSmb+gJiTxfNwIrP+VLkWYzPREpSbghDYjE2DfC\n' +
    'M8pNbVWpnOfT7OlhN3jw8pxHWap6PxNyVT2W/1AHNGKTK/BfFVn3nVGhOgPgH1AO\n' +
    'sObYxm9gpkNkelXejA/trbLe4hg7RWNYzOztbfbZakdVjMNfXnyw+Q0=\n' +
    '-----END RSA PRIVATE KEY-----\n'
});

roles['bedrock-ledger-test.test'] = {
  id: 'bedrock-ledger-test.test',
  label: 'Test Role',
  comment: 'Role for Test User',
  sysPermission: [
    permissions.LEDGER_ACCESS.id,
    permissions.LEDGER_CREATE.id,
    permissions.LEDGER_REMOVE.id,
    permissions.LEDGER_AGENT_ACCESS.id,
    permissions.LEDGER_AGENT_CREATE.id,
    permissions.LEDGER_AGENT_REMOVE.id
  ]
};

config['ledger-consensus-continuity'].consensus.workerpool.enabled = false;
