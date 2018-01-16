/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  bindings: {
    collection: '<brCollection',
  },
  controller: Ctrl,
  templateUrl: 'bedrock-ledger-test/home-component.html'
};

/* @ngInject */
function Ctrl($route) {
  const self = this;

  self.refresh = () => {
    $route.reload();
  };

  self.passTotal = () => {
    const sum = self.collection.clients.reduce((a, b) => a.pass + b.pass, 0);
    return sum;
  };
}
