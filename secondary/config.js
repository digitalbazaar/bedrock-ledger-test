/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const config = bedrock.config;
const path = require('path');

config['ledger-test'] = {};

config['ledger-test'].routes = {
  mongoExpress: '/mongo',
  newLedger: '/ledger-test/ledgers',
};

config['ledger-test'].did =
  'did:ledgertest:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59';

// interval to add new events (ms)
config['ledger-test'].eventInterval = 5000;

config['ledger-test'].genesisBlock = {
  "@context": "https://w3id.org/webledger/v1",
  "id": "did:ledgertest:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59/blocks/0",
  "type": "WebLedgerEventBlock",
  "consensusMethod": "Continuity2017",
  "event": [
    {
      "@context": "https://w3id.org/webledger/v1",
      "type": "WebLedgerConfigurationEvent",
      "ledgerConfiguration": {
        "type": "WebLedgerConfiguration",
        "ledger": "did:ledgertest:eb8c22dc-bde6-4315-92e2-59bd3f3c7d59",
        "consensusMethod": "Continuity2017",
        "eventValidator": []
      },
      "signature": {
        "type": "LinkedDataSignature2015",
        "created": "2017-10-04T15:03:18Z",
        "creator": "https://bedrock.local:18443/consensus/continuity2017/voters/0a8c860e-6709-406f-9def-6281571e368c#key",
        "signatureValue": "eEPT/i+TEg5/s9OcBY1WOEV0Zbzcvzypp+BRpZcABMynk8RDftN5E0fbisABWmZCfyMSl4Vyd6ab7wb1DAcinKImQaUIRe8jU1fDXChXP436ZBTturTUxncjrxLOTWJdTEXI+X5A+V2tbltCmZ4SLYvyDc5adGg1tQCAOU1FzVaae+uS7oNusNgYxyNLX08Pzm1OhQ3hP2dGF+RVruFmjesriWupCntvG7NnH/RnkpHtTrc5sfl+bm4fVMJd3sBBYF7fpR5/Z9uHaqt+v1DCwWCuWo5bRy2mBkGwts2Jvgl823dcgzcI+VIpLRLHj6u8XBC2K8IQRHlUu20JaD0jHA=="
      }
    }
  ],
  "electionResult": [
    {
      "@context": "https://w3id.org/webledger/v1",
      "blockHeight": 0,
      "manifestHash": "ni:///sha-256;AxZgzhM9Xak54m5AcP-Xyc-4QdVKUUWSVll7pl8mLMs",
      "voteRound": 1,
      "voter": "https://bedrock.local:18443/consensus/continuity2017/voters/0a8c860e-6709-406f-9def-6281571e368c",
      "recommendedElector": [
        {
          "id": "https://bedrock.local:18443/consensus/continuity2017/voters/0a8c860e-6709-406f-9def-6281571e368c"
        }
      ],
      "signature": {
        "type": "LinkedDataSignature2015",
        "created": "2017-10-04T15:03:18Z",
        "creator": "https://bedrock.local:18443/consensus/continuity2017/voters/0a8c860e-6709-406f-9def-6281571e368c#key",
        "signatureValue": "T20KQxkEfyv4e/ceg6e9Ny89lfMoh25FyIzqnSrkG/G1evBh1Hxvz82UR2VDcF6EnWCaMProXKZAsAqQFixRy2PBJNh+aACjIbI1ib26zIxgwGRVHTACi0fa61S0IPVVqoo9yWukS94xVDOut8/tONLdfZWB8iw6zk5d4oLcYlUxyPKnYSP/2249+mvUEITs/T90QTIjzgdsUWAxPKpvTJzB4EBy22bD8aovY7bSxelQP/LkDAdP+lzNcGSIZc99bPoA7Burz//D37n4uCfxVHygRybi0/dmfgSoBKarKVaQZQ67BDFywK/2+bYIoxLer/oRXRZRt6pv/Dn8B9h/Fg=="
      }
    }
  ],
  "blockHeight": 0,
  "publicKey": [
    {
      "id": "https://bedrock.local:18443/consensus/continuity2017/voters/0a8c860e-6709-406f-9def-6281571e368c#key",
      "type": "CryptographicKey",
      "owner": "https://bedrock.local:18443/consensus/continuity2017/voters/0a8c860e-6709-406f-9def-6281571e368c",
      "publicKeyPem": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvl4R3on5gTwBoyGpon1u\nll3y9b3C0ULFZhpLU+QfXwzg1SoUJp34NVzoCoEKykWGyPN6w3lggJ/OhcJvF8h4\n/HrIhHiXer5GRJe9Uiv1ZXbBRHLE7ec7jhFeKvAwJHvMSpOasxVydR48sTSuKe0t\naKzIOY1dqpxvuRE71sXkDZ3UgU4xdmCPLTE5E936gaEC5o1gv5uTTgIVY6Qn4LpT\nbQWd+meCC/r4/g/vpxB2qIuWOho74cbxJ0lmaXUujo/mEqUhCb6EJyg4tO5ckjmW\nUdvjzcu2dqS3cbQPXBmJqUiAipei+2tatrfK59zr39K2i6k7wDzSVhd+XHjygP2A\n+wIDAQAB\n-----END PUBLIC KEY-----\n"
    }
  ]
};

config.paths.log = path.join('/var', 'log', 'bedrock-ledger-test');

// core configuration
config.core.workers = 1;
config.core.worker.restart = true;

// mongodb config
config.mongodb.name = 'ledger_test_secondary';

// enable consensus workers
config.ledger.jobs.scheduleConsensusWork.enabled = true;
