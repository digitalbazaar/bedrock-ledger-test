#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pkgcloud = require('pkgcloud');
const {promisify} = require('util');
const uuid = require('uuid/v4');
const yaml = require('js-yaml');

const program = require('commander');

program
  .option('-n, --network [value]', 'network id')
  .parse(process.argv);

let auth;
try {
  auth = yaml.safeLoad(fs.readFileSync(
    path.join(__dirname, 'cloud-auth.yml'), 'utf8'));
} catch(e) {
  console.error(e);
  process.exit(1);
}

const consoleConfig = fs.readFileSync(
  path.join(__dirname, 'cloud-config-dashboard.yml'), 'utf8');

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
// const network = pkgcloud.network.createClient(clientOptions);

const createServer = promisify(openstack.createServer.bind(openstack));
const getServer = promisify(openstack.getServer.bind(openstack));
// const getPorts = promisify(network.getPorts.bind(network));
// const getFloatingIps = promisify(network.getFloatingIps.bind(network));
// const updateFloatingIp = promisify(network.updateFloatingIp.bind(network));

async function run() {
  const server = await createServer({
    cloudConfig: Buffer.from(consoleConfig).toString('base64'),
    flavor: '14cb1106-0d17-48d4-9b85-90d743ccae06', // branch-test
    image: 'fee15bca-2898-4ce2-bd0e-f085a2a29621', // node10base
    keyname: 'matt-rsa',
    name: `dashboard-${uuid()}`,
    networks: [{uuid: 'e78a0d0d-dab0-4e9d-b4f1-f451ff32c6a9'}],
    securityGroups: [{name: 'bedrock-ledger-test'}, {name: 'inspector'}],
  });

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
  process.stdout.write(serverDetails.addresses.private[0] + '\n');
} // end run

run().catch(e => {
  console.error(e);
  process.exit(1);
});

function _sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}
