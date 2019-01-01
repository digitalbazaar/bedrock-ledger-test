#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pkgcloud = require('pkgcloud');
const {promisify} = require('util');
const uuid = require('uuid/v4');
const yaml = require('js-yaml');

const program = require('commander');

program
  .option('-d, --dashboard [value]', 'dashboard hostname')
  .option('-m, --mongo [value]', 'mongo server hostname')
  .option('-n, --network [value]', 'network id')
  .parse(process.argv);

if(!program.mongo) {
  console.log(
    'Hostname for the mongo server must be specified.');
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

let primaryConfig = fs.readFileSync(
  path.join(__dirname, 'cloud-config-primary-local-mongo.yml'), 'utf8');

primaryConfig = primaryConfig.replace('_DASHBOARD_', program.dashboard);
primaryConfig = primaryConfig.replace('_MONGOSERVER_', program.mongo);

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
    cloudConfig: Buffer.from(primaryConfig).toString('base64'),
    flavor: '2c79b084-b48c-45c2-bfae-d4bda5956aee', // ledger-medium
    image: '2a0201f4-be99-4a99-8913-379baea704e8', // node10base2
    keyname: 'matt-rsa',
    name: `primary-${uuid()}`,
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
  process.stdout.write(serverDetails.addresses.private[0] + ' ' +
    serverDetails.addresses.private[0] + '\n');
} // end run

run().catch(e => {
  console.error(e);
  process.exit(1);
});

function _sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}
