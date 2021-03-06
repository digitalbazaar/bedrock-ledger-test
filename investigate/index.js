const async = require('async');
const bedrock = require('bedrock');
const database = require('bedrock-mongodb');
const eventHashes = require('./event-hashes');

require('./config');

const eventCollectionName = '42de5ba2-a283-4407-b7b7-49feb66c844b-event';

bedrock.events.on('bedrock-mongodb.ready', callback => async.auto({
  openCollections: callback =>
    database.openCollections([eventCollectionName], callback)
}, err => callback(err)));

bedrock.events.on('bedrock.started', () => {
  console.log('STARTED!!!!!!!!!!!!!!!!!!!!!');
  const eventsCollection = database.collections[eventCollectionName];
  // const query = {
  //   eventHash: 'ni:///sha-256;7pohwbQPLj85PyFzHFkkp9wsO_sa4MnMGMbut2rUqfQ'
  // };
  console.log('original length', eventHashes.length);
  eventsCollection.find({
    eventHash: {$in: eventHashes},
    'meta.deleted': {$exists: false}
  }).count((err, result) => {
    if(err) {
      console.log('ERROR', err);
      bedrock.exit(err);
    }
    console.log('Count', result);
    bedrock.exit();
  });
  // const projection = {_id: 0, eventHash: 1};
  // async.mapSeries(eventHashes, (eventHash, callback) =>
  //   eventsCollection.findOne({eventHash}, projection, (err, result) => {
  //     if(err) {
  //       return callback(err);
  //     }
  //     if(!result) {
  //       console.log('BOO!');
  //     }
  //     callback(null, result);
  //   }),
  // (err, result) => {
  //   if(err) {
  //     console.log('An error occurred', err);
  //     return bedrock.exit(err);
  //   }
  //   // console.log('LOCAL-FIND', JSON.stringify(result, null, 2));
  //   console.log('DONE.');
  //   bedrock.exit();
  // });
});

bedrock.start();
