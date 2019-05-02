/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const brIdentity = require('bedrock-identity');
const brKey = require('bedrock-key');
const {config} = bedrock;

bedrock.events.on('bedrock-mongodb.ready', async () => {
  await _insert(config['ledger-test'].identities);
});

async function _insert(identities) {
  try {
    for(const i in identities) {
      const identity = identities[i];
      await brIdentity.insert(
        {actor: null, identity: identity.identity, meta: identity.meta}),
      await brKey.addPublicKey(
        {actor: null, publicKey: identity.keys.publicKey});
    }
  } catch(e) {
    if(e.name !== 'DuplicateError') {
      // duplicate error means test data is already loaded
      throw e;
    }
  }
}
