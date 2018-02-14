#!/usr/bin/env node

// const program = require('commander');

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config.json');

let execute = true;

// program
//   .option('-p, --primary [value]', 'primary node hostname')
//   .parse(process.argv);
//
// if(execute && !program.primary) {
//   execute = false;
//   console.log(
//     'Hostname for the primary must be specified with --primary option.');
//   process.exitCode = 1;
// }

if(execute) {
  // Create EC2 service object
  const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

  const userData = `
  #cloud-config
  runcmd:
   - mkfs.xfs /dev/nvme0n1
   - [ sh, -xc, "echo /dev/nvme0n1 /mnt/db xfs rw,nobarrier,auto 0 0 >> /etc/fstab" ]
   - mount /dev/nvme0n1 /mnt/db
   - mkdir /mnt/db/mongodb
   - chown mongodb:mongodb /mnt/db/mongodb
   - systemctl enable mongod
   - systemctl start mongod
   `;

  let params = {
    // ImageId: 'ami-cd0f5cb6', // amazon default ubuntu 16.04
    // ImageId: 'ami-a09a99d', // mongo 3.4.11
    // InstanceType: 'm5.xlarge',
    ImageId: 'ami-1d6d7067', // i3 mongo 3.4.11
    InstanceType: 'i3.large',
    KeyName: 'aws-personal',
    IamInstanceProfile: {
      Arn: 'arn:aws:iam::526237877329:instance-profile/bedrock-ledger-node'
    },
    MinCount: 1,
    MaxCount: 1,
    SecurityGroupIds: ['sg-ee5cef99'],
    SubnetId: 'subnet-a84582a7',
    UserData: Buffer.from(userData).toString('base64')
  };

  // Create the instance
  ec2.runInstances(params, function(err, data) {
    if(err) {
      console.log("Could not create instance", err);
      process.exitCode = 1;
      return;
    }
    const {InstanceId, PrivateDnsName} = data.Instances[0];
    // Add tags to the instance
    params = {Resources: [InstanceId], Tags: [{
      Key: 'Name',
      Value: 'mongo-server'
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
