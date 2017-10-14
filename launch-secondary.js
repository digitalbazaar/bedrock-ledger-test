const async = require('async');

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config.json');

const userData = `
#cloud-config
runcmd:
 - git clone https://github.com/digitalbazaar/bedrock-ledger-test.git
 - cd bedrock-ledger-test
 - npm install
 - curl -O https://gist.githubusercontent.com/mattcollier/1ba8b6922dc5fed8e1e3f34b669d5d45/raw/b1ea8a7e471c62e0a1617073e1230ba76079118e/aws.config.js
 - npm run secondary-aws >/dev/null 2>&1
 `;

// Create EC2 service object
const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

let params = {
  // ImageId: 'ami-cd0f5cb6', // amazon default ubuntu 16.04
  ImageId: 'ami-69cb0913', // node, mongo base
  InstanceType: 't2.medium',
  KeyName: 'aws-personal',
  IamInstanceProfile: {
    Arn: 'arn:aws:iam::526237877329:instance-profile/bedrock-ledger-node'
  },
  MinCount: 9,
  MaxCount: 9,
  SecurityGroupIds: ['sg-9e6359ed'],
  SubnetId: 'subnet-60c3b105',
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
    }]};
    ec2.createTags(params, callback);
  }]
});
