/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  bindings: {
    collection: '<brCollection'
  },
  controller: Ctrl,
  templateUrl: 'bedrock-ledger-test/home-component.html'
};

/* @ngInject */
function Ctrl($route) {
  const self = this;

  self.blocksPerMinute = (blocks, startTime) => {
    const seconds = (Date.now() - startTime) / 1000;
    const minutes = seconds / 60;
    return (blocks / minutes).toFixed(2);
  };

  self.refresh = () => {
    $route.reload();
  };

  self.averageDups = () => {
    const dups = self.collection.peers.map(p => p.status.events.dups);
    if(dups.some(d => d === null)) {
      return 0;
    }
    const sum = dups.reduce((a, b) => a + b, 0);
    return Math.round(sum / dups.length);
  };

  self.averageEventsPerSecond = () => {
    const eventsPerSecond = self.collection.peers.map(p =>
      p.status.events.eventsPerSecondLocal +
        p.status.events.eventsPerSecondPeer);
    // incase some peers are not reporting
    if(eventsPerSecond.some(d => d === null)) {
      return 0;
    }
    const sum = eventsPerSecond.reduce((a, b) => a + b, 0);
    return Math.round(sum / eventsPerSecond.length);
  };

  self.dupPercent = () => {
    const eps = self.averageEventsPerSecond();
    if(eps === 0) {
      return 0;
    }
    const epm = eps * 60;
    return `${Math.round(self.averageDups() / epm * 100)}%`;
  };
}
