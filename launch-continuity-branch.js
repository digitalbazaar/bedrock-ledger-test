#!/usr/bin/env node

const delay = require('delay');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const uuid = require('uuid-random');
const {createServer, getServer} = require('./compute-api');

program
  .option('-b, --branch [value]', 'branch name')
  .option('-c, --count <n>', 'instance count')
  .parse(process.argv);

let continuityBranchConfig = fs.readFileSync(
  path.join(__dirname, 'cloud-config-continuity-branch.yml'), 'utf8');

continuityBranchConfig = continuityBranchConfig.replace(
  '_CONTINUITYBRANCH_', program.branch);

// const getPorts = promisify(network.getPorts.bind(network));
// const getFloatingIps = promisify(network.getFloatingIps.bind(network));
// const updateFloatingIp = promisify(network.updateFloatingIp.bind(network));

const instanceCount = program.count ? parseInt(program.count, 10) : 1;

async function run() {
  for(let i = 0; i < instanceCount; ++i) {
    const server = await createServer({
      cloudConfig: Buffer.from(continuityBranchConfig).toString('base64'),
      // branch-test
      flavor: '14cb1106-0d17-48d4-9b85-90d743ccae06',
      // ledger-test-node14.15-mongo4.2-redis5
      image: 'be97b75a-19dd-422c-87f1-11c20b5797b1',
      name: `continuity-${uuid()}`,
      networks: [{uuid: 'e78a0d0d-dab0-4e9d-b4f1-f451ff32c6a9'}],
      securityGroups: [{name: 'default'}],
    });
    // const floatingIps = await getFloatingIps();

    // wait for the server to be in a `RUNNING` state
    let serverDetails;
    for(let i = 0; i < 60; ++i) {
      serverDetails = await getServer(server.id);
      if(serverDetails.addresses.private) {
        break;
      }
      await delay(1000);
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
