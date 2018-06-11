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
      image: '38b48578-165a-4ff3-ae1b-f908fe9020a4', // ledger-server-v1.1
      name: `event-client-${uuid()}`,
      flavor: 'd943944c-03cc-46eb-80de-015a101e9bea',
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

// FIXME: remove
/*
if(execute) {
  const userData = `
  #cloud-config
  runcmd:
   - git clone https://github.com/digitalbazaar/bedrock-ledger-test.git
   - cd bedrock-ledger-test
   - git checkout draco
   - cd event-client
   - [ sh, -xc, "echo primary-hostname: ${program.primary} > ./instance-config.yml" ]
   - npm install
   - ./build-event-client-aws.sh >/dev/null 2>&1
   `;

  // Create EC2 service object
  const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

  let params = {
    // ImageId: 'ami-cd0f5cb6', // amazon default ubuntu 16.04
    // ImageId: 'ami-44b59d3e', // ledger2.0
    //ImageId: 'ami-07d1cc7d', // disabled mongo, dnsmasq
    ImageId: 'ami-2d923050',
    // InstanceType: 't2.medium',
    InstanceType: 'c5.large',
    // InstanceType: 'm5.xlarge',
    //KeyName: 'aws-personal',
    IamInstanceProfile: {
      Arn: 'arn:aws:iam::818836321125:instance-profile/bedrock-server'
    },
    MinCount: 1,
    MaxCount: 1,
    SecurityGroupIds: ['sg-2a131b5d'],
    SubnetId: 'subnet-ac9f94e7',
    UserData: Buffer.from(userData).toString('base64')
  };

  // Create the instance
  ec2.runInstances(params, function(err, data) {
    if(err) {
      console.log("Could not create instance", err);
      process.exitCode = 1;
      return;
    }
    const {InstanceId} = data.Instances[0];
    // Add tags to the instance
    params = {Resources: [InstanceId], Tags: [{
      Key: 'Name',
      Value: 'ledger-test-event-client'
    }, {
      Key: 'network-id',
      Value: program.network
    }]};
    ec2.createTags(params, function() {
      // console.log("Tagging instance", err ? "failure" : "success");
    });
    ec2.waitFor(
      'instanceRunning', {Filters: [
        {Name: 'instance-id', Values: [InstanceId]}
      ]},
      (err, data) => {
        if(err) {
          console.log('Error', err);
          process.exitCode = 1;
          return;
        }
        // add leading space
        const {PublicDnsName} = data.Reservations[0].Instances[0];
        process.stdout.write(`${PublicDnsName}\n`);
      });
  });
}
*/
