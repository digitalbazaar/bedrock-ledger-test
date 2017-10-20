const async = require('async');
const bedrock = require('bedrock');
const brIdentity = require('bedrock-identity');
const brKey = require('bedrock-key');
const database = require('bedrock-mongodb');
const config = bedrock.config;

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  _insert(config['ledger-test'].identities, callback);
});

function _insert(identities, callback) {
  async.forEachOf(
    identities, (identity, key, callback) => async.parallel([
      callback => brIdentity.insert(null, identity.identity, callback),
      callback => brKey.addPublicKey(null, identity.keys.publicKey, callback)
    ], callback),
    err => {
      if(err) {
        if(!database.isDuplicateError(err)) {
          // duplicate error means test data is already loaded
          return callback(err);
        }
      }
      callback();
    }, callback);
}
