// this script ensures that all the nodes have exactly the same eventHashes

const _ = require('lodash');
const async = require('async');
const bedrock = require('bedrock');
const database = require('bedrock-mongodb');

require('./config');

let blockCollections;
let eventCollections;

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
  eventCollections: callback => database.client.listCollections({}).toArray(
    (err, result) => {
      if(err) {
        return callback(err);
      }
      eventCollections = result.map(c => c.name)
        .filter(n => n.endsWith('-event'));
      callback(null, eventCollections);
    }),
  openCollections: [
    'blockCollections', 'eventCollections', (results, callback) =>
      database.openCollections([
        ...results.blockCollections,
        ...results.eventCollections,
        'continuity2017_voter',
        'ledgerNode'
      ], callback)],
  ledgerInfo: ['openCollections', ledgerInfo],
  events: ['ledgerInfo', _investigateEvents],
  blocks: ['events', _investigateBlocks],
  blocks2: ['blocks', _investigateBlocks2]
}, err => {
  if(err) {
    console.log(err);
  }
  bedrock.exit(err);
}));

const ledgerInfo = (result, callback) => {
  return callback();
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

const _investigateBlocks = (results, callback) => {
  const query = {
    // 'meta.consensus': false,
    // 'event.type': 'WebLedgerOperationEvent',
  };
  async.map(blockCollections, (c, callback) => {
    database.collections[c].count(query, (err, result) => {
      if(err) {
        return callback(err);
      }
      // collectionMap[c].count = result;
      callback(null, {c, result});
    });
  }, (err, result) => {
    console.log('BLOCKCOUNT', result);
    // if(!result.every(r => r.meta.blockHash === result[0].meta.blockHash)) {
    //   // console.log(`----- ${c} ------`);
    //   // console.log(JSON.stringify(result, null, 2));
    //   console.log('COLLECTION MAP', JSON.stringify(collectionMap, null, 2));
    //   return callback(new Error('stop'));
    // }
    callback();
  });
};

const _investigateBlocks2 = (results, callback) => {
  const query = {
    // 'meta.consensus': false,
    // 'event.type': 'WebLedgerOperationEvent',
  };
  const projection = {
    _id: 0,
    'meta.blockHash': 1,
    'block.blockHeight': 1,
  };
  const sort = {
    'block.blockHeight': -1
  };
  async.map(blockCollections, (c, callback) => {
    database.collections[c].find(query, projection).sort(sort).limit(1)
      .toArray((err, result) => {
        if(err) {
          return callback(err);
        }
        // collectionMap[c].count = result;
        callback(null, {c, result});
      });
  }, (err, result) => {
    // console.log('LATESTBLOCK', JSON.stringify(result, null, 2));
    // if(!result.every(r => r.meta.blockHash === result[0].meta.blockHash)) {
    //   // console.log(`----- ${c} ------`);
    //   // console.log(JSON.stringify(result, null, 2));
    //   console.log('COLLECTION MAP', JSON.stringify(collectionMap, null, 2));
    //   return callback(new Error('stop'));
    // }
    callback(err);
  });
};

const _investigateEvents = (results, callback) => {
  const query = {
    // 'meta.consensus': false,
    // 'event.type': 'WebLedgerOperationEvent',
  };
  const projection = {
    _id: 0,
    'meta.eventHash': 1,
  };
  async.map(eventCollections, (c, callback) => {
    database.collections[c].find(query, projection).toArray((err, result) => {
      if(err) {
        return callback(err);
      }
      // collectionMap[c].count = result;
      const hashes = result.map(r => r.meta.eventHash);
      callback(null, {c, hashes});
    });
  }, (err, result) => {
    // console.log('EVENTCOUNT', result);
    console.log('NUMBER OF NODES', result.length);
    if(!result.every(r =>
      _.isEqual(_.sortBy(r.hashes), _.sortBy(result[0].hashes)))) {
      return callback(new Error('EVENTHASH MISMATCH!'));
    }
    console.log('ALL EVENTHASHES ON ALL THE NODES ARE IDENTICAL');
    callback();
  });
};

bedrock.start();
