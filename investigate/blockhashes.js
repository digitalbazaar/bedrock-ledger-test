const async = require('async');
const bedrock = require('bedrock');
const database = require('bedrock-mongodb');

require('./config');

let blockCollections;

bedrock.events.on('bedrock-mongodb.ready', () => async.auto({
  blockCollections: callback => database.client.listCollections({}).toArray(
    (err, result) => {
      if(err) {
        return callback(err);
      }
      blockCollections = result.map(c => c.name)
        .filter(n => n.endsWith('-block'));
      callback(null, blockCollections);
    }),
  openCollections: ['blockCollections', (results, callback) =>
    database.openCollections(results.blockCollections, callback)],
  investigate: ['openCollections', investigate]
}, err => bedrock.exit(err)));

const investigate = (results, callback) => {
  async.eachSeries(blockCollections, (c, callback) => {
    database.collections[c].find({}, {
      _id: 0,
      'block.blockHeight': 1,
      'block.previousBlockHash': 1,
      'meta.blockHash': 1,
    }).sort({'block.blockHeight': -1}).limit(5).toArray((err, result) => {
      if(err) {
        return callback(err);
      }
      console.log(`----- ${c} ------`);
      console.log(JSON.stringify(result, null, 2));
      callback();
    });
  }, callback);
};

bedrock.start();
