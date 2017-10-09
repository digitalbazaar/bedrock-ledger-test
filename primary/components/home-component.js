/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  bindings: {
    peers: '<brPeers'
  },
  controller: Ctrl,
  templateUrl: 'bedrock-ledger-test/home-component.html'
};

/* @ngInject */
function Ctrl($route) {
  const self = this;

  self.eventsPerSecond = (events, startTime) => {
    const seconds = (Date.now() - startTime) / 1000;
    return (events / seconds).toFixed(2);
  };

  self.refresh = () => {
    $route.reload();
  };
}
