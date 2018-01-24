// Load the AWS SDK for Node.js
const async = require('async');
const AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config.json');

const userData = `
#cloud-config
runcmd:
 - echo 127.0.0.1 bedrock.local >> /etc/hosts
 - git clone https://github.com/digitalbazaar/bedrock-ledger-consensus-continuity.git
 - cd bedrock-ledger-consensus-continuity
 - git checkout prior-to-diff
 - npm install
 - cd test
 - npm install
 - ./loop.sh
 `;

// Create EC2 service object
const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

let params = {
  // ImageId: 'ami-cd0f5cb6', // amazon default ubuntu 16.04
  ImageId: 'ami-44b59d3e', // node, mongo base
  // InstanceType: 't2.medium',
  InstanceType: 'c5.large',
  KeyName: 'aws-personal',
  IamInstanceProfile: {
    Arn: 'arn:aws:iam::526237877329:instance-profile/bedrock-ledger-node'
  },
  MinCount: 10,
  MaxCount: 10,
  SecurityGroupIds: ['sg-9e6359ed'],
  SubnetId: 'subnet-5e34ab03',
  // SubnetId: 'subnet-60c3b105',
  UserData: Buffer.from(userData).toString('base64')
};

// Create the instances
async.auto({
  run: callback => ec2.runInstances(params, callback),
  tag: ['run', (results, callback) => {
    const Resources = results.run.Instances.map(i => i.InstanceId);
    params = {Resources, Tags: [{
      Key: 'Name',
      Value: 'test-runner'
    }]};
    ec2.createTags(params, callback);
  }]
}, err => {
  if(err) {
    console.log('ERROR', err);
  }
});
