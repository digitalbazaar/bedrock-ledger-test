#!/usr/bin/env node

const program = require('commander');

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config.json');

let execute = true;

program
  .option('-n, --network [value]', 'network id')
  .option('-p, --primary [value]', 'primary node hostname')
  .parse(process.argv);

if(execute && !program.primary) {
  execute = false;
  console.log(
    'Hostname for the primary must be specified with --primary option.');
  process.exitCode = 1;
}

if(execute) {
  const userData = `
  #cloud-config
  runcmd:
   - systemctl enable mongod
   - systemctl start mongod
   - git clone https://github.com/digitalbazaar/bedrock-ledger-test.git
   - cd bedrock-ledger-test
   - git checkout experimental
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
    ImageId: 'ami-07d1cc7d', // disabled mongo, dnsmasq
    // InstanceType: 't2.medium',
    InstanceType: 'c5.large',
    // InstanceType: 'm5.xlarge',
    KeyName: 'aws-personal',
    IamInstanceProfile: {
      Arn: 'arn:aws:iam::526237877329:instance-profile/bedrock-ledger-node'
    },
    MinCount: 1,
    MaxCount: 1,
    SecurityGroupIds: ['sg-9e6359ed'],
    SubnetId: 'subnet-acedaff1',
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
      Value: 'event-client'
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
