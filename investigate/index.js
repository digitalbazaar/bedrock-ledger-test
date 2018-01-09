const async = require('async');
const bedrock = require('bedrock');
const database = require('bedrock-mongodb');

require('./config');

const eventCollectionName = 'e8766556-e2d6-40e4-a8ca-1aa1e3b396ca-event';

bedrock.events.on('bedrock-mongodb.ready', callback => async.auto({
  openCollections: callback =>
    database.openCollections([eventCollectionName], callback)
}, err => callback(err)));

bedrock.events.on('bedrock.started', () => {
  const eventsCollection = database.collections[eventCollectionName];
  const query = {};
  async.auto({
    find: callback => eventsCollection.find(query).toArray(callback)
  }, (err, results) => {
    if(err) {
      console.log('An error occurred', err);
    } else {
      console.log('LOCAL-FIND', JSON.stringify(results.find, null, 2));
    }
    bedrock.exit(err);
  });
});

bedrock.start();
