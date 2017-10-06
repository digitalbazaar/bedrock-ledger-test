// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config.json');

const userData = `
#cloud-config
apt_upgrade: true
runcmd:
 - timedatectl set-timezone America/New_York
 - curl -sL https://deb.nodesource.com/setup_6.x | bash -
 - apt-get install -y nodejs build-essential libkrb5-dev ntp python htop git s3cmd parallel
 - curl -sL https://gist.githubusercontent.com/mattcollier/21b8b0a26a3c7cca7f8af2faabdb152a/raw/eb35ee78764946cdb37ac1fd75c0a2eae1a0dc7a/mongo.sh | bash -
 - curl -sL https://gist.githubusercontent.com/mattcollier/f4eebff1937b37b585519c0944817553/raw/df7c37824e5262cd64b6b9310fb44421a51a9101/enable_mongo.sh | bash -
 - curl -O https://gist.githubusercontent.com/mattcollier/55e976a4a196756682feb99daf41b5a0/raw/mongo-config.js
 - sleep 5
 - mongo mongo-config.js
 - git clone https://github.com/digitalbazaar/bedrock-ledger-test.git
 - cd bedrock-ledger-test
 - npm install
 - npm run secondary-aws
 `;

// Create EC2 service object
const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

let params = {
  ImageId: 'ami-cd0f5cb6', // amzn-ami-2011.09.1.x86_64-ebs
  InstanceType: 't2.medium',
  KeyName: 'aws-personal',
  MinCount: 10,
  MaxCount: 10,
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
    Value: 'Secondary'
  }]};
  ec2.createTags(params, function(err) {
    console.log("Tagging instance", err ? "failure" : "success");
  });
});
