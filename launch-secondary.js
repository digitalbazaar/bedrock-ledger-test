#!/usr/bin/env node

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const pkgcloud = require('pkgcloud');
const {promisify} = require('util');
const program = require('commander');
const uuid = require('uuid/v4');
const yaml = require('js-yaml');

program
  .option('-c, --count <n>', 'instance count')
  .option('-d, --dashboard [value]', 'dashboard hostname')
  .option('-m, --mongo [value]', 'mongo server hostname')
  .option('-n, --network [value]', 'network id')
  .option('-p, --primary [value]', 'primary node hostname')
  .parse(process.argv);

if(!(program.primary && program.mongo)) {
  console.log(
    'Hostname for the primary and mongo must be specified.');
  process.exitCode = 1;
}

let auth;
try {
  auth = yaml.safeLoad(fs.readFileSync(
    path.join(__dirname, 'cloud-auth.yml'), 'utf8'));
} catch(e) {
  console.error(e);
  process.exit(1);
}

let secondaryConfig = fs.readFileSync(
  path.join(__dirname, 'cloud-config-secondary-local-mongo.yml'), 'utf8');

secondaryConfig = secondaryConfig.replace('_DASHBOARD_', program.dashboard);
secondaryConfig = secondaryConfig.replace('_MONGOSERVER_', program.mongo);
secondaryConfig = secondaryConfig.replace('_PRIMARYSERVER_', program.primary);

const clientOptions = {
  keystoneAuthVersion: 'v3',
  provider: 'openstack', // required
  username: auth.username, // required
  password: auth.password, // required
  authUrl: 'http://controller:5000', // required
  // strictSSL: false,
  domainId: 'default',
  region: 'Blacksburg',
  tenantName: 'veres-delta-stress',
  projectDomainId: 'default',
};

const openstack = pkgcloud.compute.createClient(clientOptions);
const network = pkgcloud.network.createClient(clientOptions);

const createServer = promisify(openstack.createServer.bind(openstack));
const getServer = promisify(openstack.getServer.bind(openstack));
const getPorts = promisify(network.getPorts.bind(network));
const getFloatingIps = promisify(network.getFloatingIps.bind(network));
const updateFloatingIp = promisify(network.updateFloatingIp.bind(network));

const instanceCount = program.count ? parseInt(program.count, 10) : 1;

async function run() {
  for(let i = 0; i < instanceCount; ++i) {
    const server = await createServer({
      cloudConfig: Buffer.from(secondaryConfig).toString('base64'),
      flavor: 'ce092c0e-7c5b-4eea-8195-089458cdbe55', // branch-test
      image: '2a0201f4-be99-4a99-8913-379baea704e8', // node10base2
      keyname: 'matt-rsa',
      name: `secondary-${uuid()}`,
      networks: [{uuid: 'e78a0d0d-dab0-4e9d-b4f1-f451ff32c6a9'}],
      securityGroups: [{name: 'bedrock-ledger-test'}],
    });
    const floatingIps = await getFloatingIps();

    // wait for the server to be in a `RUNNING` state
    let serverDetails;
    for(let i = 0; i < 30; ++i) {
      serverDetails = await getServer(server.id);
      if(serverDetails.status === 'RUNNING') {
        break;
      }
      await _sleep(1000);
    }

    // success, output IP information
    process.stdout.write(`${serverDetails.addresses.private[0]}\n`);
  }
} // end run

run().catch(e => {
  console.error(e);
  process.exit(1);
});

function _sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}
