/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  bindings: {
    peers: '<brPeers',
    latestBlock: '<brLatestBlock'
  },
  controller: Ctrl,
  templateUrl: 'bedrock-ledger-test/home-component.html'
};

/* @ngInject */
function Ctrl() {
  const self = this;

  self.selected = [];
}
