/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

/* @ngInject */
export default function factory($http, $interval) {
  const service = {};
  const baseUrl = '/ledger-test/peers';

  service.collection = {
    peers: []
  };

  $interval(() => service.getAll(), 5000);

  service.getAll = () => $http.get(baseUrl).then(response =>
    service.collection.peers = response.data);

  return service;
}
