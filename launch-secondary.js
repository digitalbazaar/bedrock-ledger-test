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
  path.join(__dirname, 'cloud-config-secondary.yml'), 'utf8');

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
      image: '080dcf87-57af-4beb-8efa-08a786bcbbad', // ledger-server-v2.0
      name: `secondary-${uuid()}`,
      // flavor: '2841e3d0-ace6-43de-ae20-3cd529710f97', // ledger.large-swap
      flavor: 'f804b933-af5a-4aa1-8bcf-6643601cf3de', // ledger-only.large-swap
      keyname: 'matt-rsa',
      networks: [{uuid: '00717900-8f91-45fa-88c8-26083ca3fec7'}],
      securityGroups: [{name: 'bedrock-ledger-test'}],
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
    process.stdout.write(`${availableFloatingIp.floating_ip_address}\n`);
  }
} // end run

run().catch(e => {
  console.error(e);
  process.exit(1);
});

function _sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}
