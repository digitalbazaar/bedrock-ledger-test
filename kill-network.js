#!/usr/bin/env node

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.loadFromPath('./config.json');

// Create EC2 service object
const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

const program = require('commander');

program
  .option('-n, --network [value]', 'network id')
  .parse(process.argv);

ec2.describeInstances({}, (err, data) => {
  if(err) {
    return;
  }
  const InstanceIds = [];
  data.Reservations.forEach(reservation => {
    reservation.Instances.forEach(instance => {
      const state = instance.State.Name;
      const secondary = !!instance.Tags.filter(
        t => (t.Key = 'network-id' && t.Value === program.network)).length;
      if(secondary && state === 'running') {
        InstanceIds.push(instance.InstanceId);
      }
    });
  });
  console.log('Terminating instances:', InstanceIds);
  ec2.terminateInstances({InstanceIds}, (err, data) => {
    console.log('ERROR', err);
    console.log('DATA', data);
  });
});
