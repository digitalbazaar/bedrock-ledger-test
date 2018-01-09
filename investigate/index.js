const async = require('async');
const bedrock = require('bedrock');
const database = require('bedrock-mongodb');
const eventHashes = require('./event-hashes');

require('./config');

const eventCollectionName = 'e8766556-e2d6-40e4-a8ca-1aa1e3b396ca-event';

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
  console.log('HHHH', eventHashes);
  const projection = {_id: 0, eventHash: 1};
  async.mapSeries(eventHashes, (eventHash, callback) =>
    eventsCollection.findOne({eventHash}, projection, callback),
  (err, result) => {
    if(err) {
      console.log('An error occurred', err);
      return bedrock.exit(err);
    }
    console.log('LOCAL-FIND', JSON.stringify(result, null, 2));
    bedrock.exit();
  });
});

bedrock.start();
