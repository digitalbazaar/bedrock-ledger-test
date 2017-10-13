/*
* Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
*/
const bedrock = require('bedrock');
const WinstonCloudWatch = require('winston-cloudwatch');

const api = {};
module.exports = api;

bedrock.events.on('bedrock-loggers.init', () => {
  bedrock.loggers.addTransport('cloudwatch', new WinstonCloudWatch({
    level: 'debug',
    logGroupName: 'bedrock-ledger-test',
    logStreamName: 'first',
    awsAccessKeyId: 'AKIAJTRS4ARDUTI3KSHQ',
    awsSecretKey: '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',
    awsRegion: 'us-east-1'
  }));
  api.logger = bedrock.loggers.get('cloudwatch');
  api.logger.on('logging', (t, level, msg, meta) => {
    console.log('XXXXXXXXXXXXXXX', t, level, msg);
  });
  api.logger.on('error', err => {
    console.log('EEEEEEEEEEEEEEEEEEEEEEEEEe', err);
  });
});
//
// const cloudwatch = bedrock.loggers.get('cloudwatch');
// module.exports = cloudwatch;

// api.logger.on('logging', (t, level, msg, meta) => {
//   console.log('XXXXXXXXXXXXXXX', t, level, msg);
// });
// api.logger.on('error', err => {
//   console.log('EEEEEEEEEEEEEEEEEEEEEEEEEe', err);
// });

// const bedrock = require('bedrock');
// const WinstonCloudWatch = require('winston-cloudwatch');
//
// const api = {};
// module.exports = api;
//
// bedrock.events.on('bedrock-loggers.init', () => {
//   bedrock.loggers.addTransport('cloudwatch', new WinstonCloudWatch({
//     logGroupName: 'testing',
//     logStreamName: 'first'
//   }));
//   api.logger = bedrock.loggers.get('cloudwatch');
// });
