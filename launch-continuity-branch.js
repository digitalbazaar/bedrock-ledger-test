#!/usr/bin/env node

// const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const pkgcloud = require('pkgcloud');
const {promisify} = require('util');
const program = require('commander');
const uuid = require('uuid/v4');
const yaml = require('js-yaml');

program
  .option('-b, --branch [value]', 'branch name')
  .option('-c, --count <n>', 'instance count')
  .parse(process.argv);

let auth;
try {
  auth = yaml.safeLoad(fs.readFileSync(
    path.join(__dirname, 'cloud-auth.yml'), 'utf8'));
} catch(e) {
  console.error(e);
  process.exit(1);
}

let continuityBranchConfig = fs.readFileSync(
  path.join(__dirname, 'cloud-config-continuity-branch.yml'), 'utf8');

continuityBranchConfig = continuityBranchConfig.replace(
  '_CONTINUITYBRANCH_', program.branch);

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

const instanceCount = program.count ? parseInt(program.count, 10) : 1;

async function run() {
  for(let i = 0; i < instanceCount; ++i) {
    const server = await createServer({
      cloudConfig: Buffer.from(continuityBranchConfig).toString('base64'),
      flavor: '14cb1106-0d17-48d4-9b85-90d743ccae06', // branch-test
      image: '27395632-3a9f-4a62-803a-c5cf0b702ba8', // test-base-mongo4
      keyname: 'matt-rsa',
      name: `continuity-${uuid()}`,
      networks: [{uuid: 'e78a0d0d-dab0-4e9d-b4f1-f451ff32c6a9'}],
      // networks: [{uuid: '00717900-8f91-45fa-88c8-26083ca3fec7'}],
      securityGroups: [{name: 'default'}],
    });
    // const floatingIps = await getFloatingIps();

    // wait for the server to be in a `RUNNING` state
    let serverDetails;
    for(let i = 0; i < 30; ++i) {
      serverDetails = await getServer(server.id);
      if(serverDetails.addresses.private) {
        break;
      }
      await _sleep(1000);
    }
    console.log(serverDetails.addresses.private[0]);

    // const ports = await getPorts();
    // const serverPort = _.find(ports, {
    //   deviceId: server.id, deviceOwner: 'compute:nova'
    // });
    // const {id: portId} = serverPort;
    // const availableFloatingIp = _.find(floatingIps, ['port_id', null]);
    // if(!availableFloatingIp) {
    //   // TODO: allocate a floating IP
    //   throw new Error('No available floating IPs.');
    // }
    //
    // // assign an available floating IP to the port on the new VM
    // const {id: floatingIpId} = availableFloatingIp;
    // await updateFloatingIp({floatingIpId, portId});
    //
    // // success, output IP information
    // process.stdout.write(`${availableFloatingIp.floating_ip_address}\n`);
  }
} // end run

run().catch(e => {
  console.error(e);
  process.exit(1);
});

function _sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}
