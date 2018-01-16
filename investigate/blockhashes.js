const async = require('async');
const bedrock = require('bedrock');
const database = require('bedrock-mongodb');
const eventHashes = require('./event-hashes');

require('./config');

const blockCollections = [
  '561bef7c-0a0f-4695-ba68-854dd3b8ca1a-block',
  '71bc61d6-0f99-4d3f-ba0c-5bd659b9b566-block',
  '8c2045a2-4f2d-4f9d-922f-0a8f610592ab-block',
  'a39dd47f-2af4-47e5-9d9b-d42640fd9501-block',
  'a4d203a2-d09f-4671-9eb2-3c08aa3c49bf-block',
  'aeb6e313-f087-4731-93f0-3ed797a2b21b-block',
  'b6999712-4801-4d70-92cd-359a05418b50-block',
  'dd2dfd62-2844-49e7-b0d8-3f03006c100b-block',
];

bedrock.events.on('bedrock-mongodb.ready', callback => async.auto({
  openCollections: callback =>
    database.openCollections(blockCollections, callback)
}, err => callback(err)));

bedrock.events.on('bedrock.started', () => {
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
  }, err => {
    if(err) {
      console.log('ERROR', err);
      bedrock.exit(err);
    }
    bedrock.exit();
  });
});

bedrock.start();
