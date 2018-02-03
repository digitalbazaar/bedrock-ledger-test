#!/usr/bin/env node

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config.json');

const program = require('commander');

let execute = true;

program
  .option('-m, --mongo [value]', 'mongo server hostname')
  .parse(process.argv);

if(!program.mongo) {
  execute = false;
  console.log(
    'Hostname for the mongo server must be specified.');
  process.exitCode = 1;
}

if(execute) {
  const userData = `
  #cloud-config
  runcmd:
   - git clone https://github.com/digitalbazaar/bedrock-ledger-test.git
   - cd bedrock-ledger-test
   - git checkout cloudwatch
   - [ sh, -xc, "echo mongo-hostname: ${program.mongo} >> ./instance-config.yml" ]
   - [ sh, -xc, "echo mongo-dbname: $(uuidgen) >> ./instance-config.yml" ]
   - npm install
   - ./build-primary-aws.sh >/dev/null 2>&1
   `;

  // Create EC2 service object
  const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

  let params = {
    // ImageId: 'ami-cd0f5cb6', // amazon default ubuntu 16.04
    ImageId: 'ami-44b59d3e', // ledger2.0
    // InstanceType: 't2.medium',
    // InstanceType: 'm5.xlarge',
    InstanceType: 'c5.large',
    KeyName: 'aws-personal',
    IamInstanceProfile: {
      Arn: 'arn:aws:iam::526237877329:instance-profile/bedrock-ledger-node'
    },
    MinCount: 1,
    MaxCount: 1,
    SecurityGroupIds: ['sg-9e6359ed'],
    SubnetId: 'subnet-a84582a7',
    // SubnetId: 'subnet-60c3b105',
    UserData: Buffer.from(userData).toString('base64')
  };

  // Create the instance
  ec2.runInstances(params, (err, data) => {
    if(err) {
      console.log("Could not create primary instance", err);
      process.exitCode = 1;
      return;
    }
    const {InstanceId, PrivateDnsName} = data.Instances[0];
    // console.log("Created instance", instanceId);
    // Add tags to the instance
    params = {Resources: [InstanceId], Tags: [{
      Key: 'Name',
      Value: 'Primary'
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
        process.stdout.write(`${PrivateDnsName} ${PublicDnsName}\n`);
      });
  });
}
