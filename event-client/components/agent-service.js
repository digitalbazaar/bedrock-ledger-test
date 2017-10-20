/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

/* @ngInject */
export default function factory($http) {
  const service = {};
  const baseUrl = '/ledger-test/ledger-agents';

  service.collection = {
    agents: []
  };

  service.getAll = () => $http.get(baseUrl).then(response =>
    service.collection.agents = response.data);

  service.updateAgent = (agentId, eventsPerSec) => $http.post(
    `${baseUrl}/${agentId}/eventsPerSec`, {eventsPerSec});

  return service;
}
