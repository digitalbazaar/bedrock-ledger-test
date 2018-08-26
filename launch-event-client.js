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
  .option('-n, --network [value]', 'network id')
  .option('-p, --primary [value]', 'primary node hostname')
  .parse(process.argv);

if(!program.primary) {
  console.log(
    'Hostname for the primary must be specified with --primary option.');
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

let eventClientConfig = fs.readFileSync(
  path.join(__dirname, 'cloud-config-event-client.yml'), 'utf8');

eventClientConfig = eventClientConfig.replace(
  '_PRIMARYSERVER_', program.primary);

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
      cloudConfig: Buffer.from(eventClientConfig).toString('base64'),
      image: 'd74bb6d1-78c0-4309-87a5-e33183f53b77', // ledger-minimal-v1.1
      name: `event-client-${uuid()}`,
      flavor: 'b3966f39-ef2a-4367-ad66-9627454ff43f', // m2.medium
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
