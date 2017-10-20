/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const api = {};
module.exports = api;

api.createHttpSignatureRequest = options => {
  const newRequest = {
    url: options.url,
    httpSignature: {
      key: options.identity.keys.privateKey.privateKeyPem,
      keyId: options.identity.keys.publicKey.id,
      headers: ['date', 'host', 'request-line']
    }
  };
  if(options.body) {
    newRequest.body = options.body;
  }
  return newRequest;
};

api.createIdentity = userName => ({
  id: 'did:7e4a0145-c821-4e56-b41e-2e73e1b0615f',
  type: 'Identity',
  sysSlug: userName,
  label: userName,
  email: userName + '@bedrock.dev',
  sysPassword: 'password',
  sysPublic: ['label', 'url', 'description'],
  sysResourceRole: [],
  url: 'https://example.com',
  description: userName,
  sysStatus: 'active'
});

api.createKeyPair = function(options) {
  const userName = options.userName;
  const publicKey = options.publicKey;
  const privateKey = options.privateKey;
  let ownerId = null;
  if(userName === 'userUnknown') {
    ownerId = '';
  } else {
    ownerId = options.userId;
  }
  const newKeyPair = {
    publicKey: {
      '@context': 'https://w3id.org/identity/v1',
      id: ownerId + '/keys/1',
      type: 'CryptographicKey',
      owner: ownerId,
      label: 'Signing Key 1',
      publicKeyPem: publicKey
    },
    privateKey: {
      type: 'CryptographicKey',
      owner: ownerId,
      label: 'Signing Key 1',
      publicKey: ownerId + '/keys/1',
      privateKeyPem: privateKey
    }
  };
  return newKeyPair;
};
