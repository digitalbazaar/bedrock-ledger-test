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

  const marker = {};

  self.blocksPerMinute = (blocks, startTime) => {
    const seconds = (Date.now() - startTime) / 1000;
    const minutes = seconds / 60;
    return (blocks / minutes).toFixed(2);
  };

  self.eventsPerSecond = ({total, label}) => {
    const now = Date.now();
    const lastMarker = marker[label] || {timeStamp: now, total};
    marker[label] = {timeStamp: now, total};
    const newEvents = total - lastMarker.total;
    const timeDiffSecs = (now - lastMarker.timeStamp) / 1000;
    return (newEvents / timeDiffSecs).toFixed(2);
  };

  self.refresh = () => {
    $route.reload();
  };
}
