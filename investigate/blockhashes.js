const async = require('async');
const bedrock = require('bedrock');
const database = require('bedrock-mongodb');

require('./config');

let blockCollections;

const collectionMap = {};

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
    database.openCollections([
      ...results.blockCollections,
      'continuity2017_voter',
      'ledgerNode'
    ], callback)],
  ledgerInfo: ['openCollections', ledgerInfo],
  investigate: ['ledgerInfo', investigate]
}, err => bedrock.exit(err)));

const ledgerInfo = (result, callback) => {
  async.eachSeries(blockCollections, (c, callback) => {
    const collectionId = `urn:uuid:${c.substring(0, 36)}`;
    collectionMap[c] = {
      collectionName: c
    };
    async.auto({
      ledgerNode: callback => database.collections.ledgerNode.findOne({
        'ledgerNode.storage.id': collectionId
      }, {_id: 0, 'ledgerNode.id': 1}, callback),
      voter: ['ledgerNode', (results, callback) => {
        const ledgerNodeId = results.ledgerNode.ledgerNode.id;
        database.collections['continuity2017_voter'].findOne({
          'voter.ledgerNodeId': ledgerNodeId
        }, callback);
      }]
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      const ledgerNodeId = results.ledgerNode.ledgerNode.id;
      const voterId = results.voter.voter.id.substr(-5);
      collectionMap[c].ledgerNode = ledgerNodeId;
      collectionMap[c].voterId = voterId;
      callback();
    });
  }, callback);
};

const investigate = (results, callback) => {
  console.log('START INVESTIGATE');
  async.timesSeries(100, (i, callback) =>
    async.map(blockCollections, (c, callback) => {
      database.collections[c].findOne({'block.blockHeight': i}, {
        _id: 0,
        'block.blockHeight': 1,
        'block.previousBlockHash': 1,
        'meta.blockHash': 1,
      }, (err, result) => {
        if(err) {
          return callback(err);
        }
        collectionMap[c].block = result;
        callback(null, result);
      });
    }, (err, result) => {
      console.log('Checking block', i);
      console.log('RRRRR', JSON.stringify(result, null, 2));
      // if(!result.every(r => r.meta.blockHash === result[0].meta.blockHash)) {
      //   // console.log(`----- ${c} ------`);
      //   // console.log(JSON.stringify(result, null, 2));
      //   console.log('COLLECTION MAP', JSON.stringify(collectionMap, null, 2));
      //   return callback(new Error('stop'));
      // }
      callback();
    }), callback);
};

bedrock.start();
