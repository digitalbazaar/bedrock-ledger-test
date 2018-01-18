// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config.json');

const userData = `
#cloud-config
runcmd:
 - git clone https://github.com/digitalbazaar/bedrock-ledger-test.git
 - cd bedrock-ledger-test
 - git checkout cloudwatch
 - cd event-client
 - npm install
 - ./build-event-client-aws.sh >/dev/null 2>&1
 `;

// Create EC2 service object
const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

let params = {
  // ImageId: 'ami-cd0f5cb6', // amazon default ubuntu 16.04
  ImageId: 'ami-ebfd8191', // node, mongo base
  // InstanceType: 't2.micro',
  InstanceType: 'm5.xlarge',
  KeyName: 'aws-personal',
  IamInstanceProfile: {
    Arn: 'arn:aws:iam::526237877329:instance-profile/bedrock-ledger-node'
  },
  MinCount: 1,
  MaxCount: 1,
  SecurityGroupIds: ['sg-9e6359ed'],
  SubnetId: 'subnet-60c3b105',
  UserData: Buffer.from(userData).toString('base64')
};

// Create the instance
ec2.runInstances(params, function(err, data) {
  if(err) {
    console.log("Could not create instance", err);
    return;
  }
  const instanceId = data.Instances[0].InstanceId;
  console.log("Created instance", instanceId);
  // Add tags to the instance
  params = {Resources: [instanceId], Tags: [{
    Key: 'Name',
    Value: 'EventClient'
  }]};
  ec2.createTags(params, function(err) {
    console.log("Tagging instance", err ? "failure" : "success");
  });
});
