#!/usr/bin/env node

const async = require('async');
const program = require('commander');

let execute = true;

program
  .option('-c, --count <n>', 'instance count')
  .option('-m, --mongo [value]', 'mongo server hostname')
  .option('-n, --network [value]', 'network id')
  .option('-p, --primary [value]', 'primary node hostname')
  .parse(process.argv);

if(!(program.primary && program.mongo)) {
  execute = false;
  console.log(
    'Hostname for the primary and mongo must be specified.');
  process.exitCode = 1;
}

if(execute) {

  // Load the AWS SDK for Node.js
  const AWS = require('aws-sdk');
  // Load credentials and set region from JSON file
  AWS.config.loadFromPath('./config.json');

  // `:` must be escaped
  const userData = `
  #cloud-config
  runcmd:
   - git clone https://github.com/digitalbazaar/bedrock-ledger-test.git
   - cd bedrock-ledger-test
   - git checkout draco-redis3
   - [ sh, -xc, "echo primary-hostname: ${program.primary} >> ./instance-config.yml" ]
   - [ sh, -xc, "echo mongo-hostname: ${program.mongo} >> ./instance-config.yml" ]
   - [ sh, -xc, "echo mongo-dbname: $(uuidgen) >> ./instance-config.yml" ]
   - npm install
   - npm run secondary-aws >/dev/null 2>&1
   `;

  // Create EC2 service object
  const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

  const instanceCount = program.count ? parseInt(program.count, 10) : 1;
  let params = {
    // ImageId: 'ami-cd0f5cb6', // amazon default ubuntu 16.04
    // ImageId: 'ami-44b59d3e', // ledger2.0
    //ImageId: 'ami-07d1cc7d', // disabled mongo, dnsmasq
    ImageId: 'ami-6a6cbe15',
    // InstanceType: 't2.medium',
    InstanceType: 'c5.large',
    // InstanceType: 'r4.large',
    // InstanceType: 'm5.xlarge',
    //KeyName: 'aws-personal',
    IamInstanceProfile: {
      Arn: 'arn:aws:iam::818836321125:instance-profile/bedrock-server'
    },
    MinCount: instanceCount,
    MaxCount: instanceCount,
    SecurityGroupIds: ['sg-2a131b5d'],
    // SubnetId: 'subnet-60c3b105',
    SubnetId: 'subnet-ac9f94e7',
    UserData: Buffer.from(userData).toString('base64')
  };

  // Create the instances
  async.auto({
    run: callback => ec2.runInstances(params, callback),
    tag: ['run', (results, callback) => {
      const Resources = results.run.Instances.map(i => i.InstanceId);
      params = {Resources, Tags: [{
        Key: 'Name',
        Value: 'ledger-test-secondary'
      }, {
        Key: 'network-id',
        Value: program.network
      }]};
      ec2.createTags(params, callback);
    }]
  }, err => {
    if(err) {
      process.exitCode = 1;
      console.log('ERROR', err);
    }
  });
}
