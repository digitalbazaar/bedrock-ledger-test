/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  bindings: {
    collection: '<brCollection',
    onChangeEvent: '&brOnChangeEvent'
  },
  controller: Ctrl,
  templateUrl: 'bedrock-ledger-test/home-component.html'
};

/* @ngInject */
function Ctrl($q, $route) {
  const self = this;

  self.eventChanged = agent => {
    // console.log('AAAAAAAAAAAAAAAAAa', agent.ledgerAgent.id);
    // console.log('BBBBBBBBBBBBBBBBBB', agent.meta.eventsPerSec);
    $q.resolve(self.onChangeEvent({
      agentId: agent.ledgerAgent.id,
      eventsPerSec: agent.meta.eventsPerSec}));
  };

  self.refresh = () => {
    $route.reload();
  };
}
