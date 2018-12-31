#!/usr/bin/env node

const _ = require('lodash');
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
const network = pkgcloud.network.createClient(clientOptions);

const createServer = promisify(openstack.createServer.bind(openstack));
const getServer = promisify(openstack.getServer.bind(openstack));
const getPorts = promisify(network.getPorts.bind(network));
const getFloatingIps = promisify(network.getFloatingIps.bind(network));
const updateFloatingIp = promisify(network.updateFloatingIp.bind(network));

async function run() {
  const server = await createServer({
    cloudConfig: Buffer.from(primaryConfig).toString('base64'),
    flavor: 'ce092c0e-7c5b-4eea-8195-089458cdbe55', // branch-test
    image: '2a0201f4-be99-4a99-8913-379baea704e8', // node10base2
    keyname: 'matt-rsa',
    name: `primary-${uuid()}`,
    networks: [{uuid: '00717900-8f91-45fa-88c8-26083ca3fec7'}],
    securityGroups: [{name: 'bedrock-ledger-test'}, {name: 'inspector'}],
  });
  const floatingIps = await getFloatingIps();

  // wait for the server to be in a `RUNNING` state
  for(let i = 0; i < 30; ++i) {
    const serverDetails = await getServer(server.id);
    if(serverDetails.status === 'RUNNING') {
      break;
    }
    await _sleep(1000);
  }

  const ports = await getPorts();
  const serverPort = _.find(ports, {
    deviceId: server.id, deviceOwner: 'compute:nova'
  });
  const {id: portId} = serverPort;
  const availableFloatingIp = _.find(floatingIps, ['port_id', null]);
  if(!availableFloatingIp) {
    // TODO: allocate a floating IP
    throw new Error('No available floating IPs.');
  }

  // assign an available floating IP to the port on the new VM
  const {id: floatingIpId} = availableFloatingIp;
  await updateFloatingIp({floatingIpId, portId});

  // success, output IP information
  process.stdout.write(availableFloatingIp.floating_ip_address + ' ' +
    availableFloatingIp.floating_ip_address + '\n');
} // end run

run().catch(e => {
  console.error(e);
  process.exit(1);
});

function _sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}
