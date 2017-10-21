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
function Ctrl($route, $interval) {
  const self = this;

  const eventWindowSize = 15000; // in ms

  const marker = {};
  self.eventWindow = {};

  $interval(() => {
    console.log('CCCCCC', JSON.stringify(self.collection, null, 2));
    // snapshot total events
    for(let i = 0; i < self.collection.peers.length; ++i) {
      const p = self.collection.peers[i];
      const now = Date.now();
      const lastMarker = marker[p.label] ||
        {timeStamp: now, total: p.status.events.total};
      marker[p.label] = {timeStamp: now, total: p.status.events.total};
      const newEvents = p.status.events.total - lastMarker.total;
      const timeDiffSecs = (now - lastMarker.timeStamp) / 1000;
      self.eventWindow[p.label] = timeDiffSecs === 0 ? 0 :
        (newEvents / timeDiffSecs).toFixed(2);
    }
  }, eventWindowSize);

  self.blocksPerMinute = (blocks, startTime) => {
    const seconds = (Date.now() - startTime) / 1000;
    const minutes = seconds / 60;
    return (blocks / minutes).toFixed(2);
  };

  self.refresh = () => {
    $route.reload();
  };
}
