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

  $interval(() => service.getAll(), 10000);

  service.getAll = () => $http.get(baseUrl).then(response =>
    service.collection.peers = response.data.map(r => {
      const {last} = r;
      last._id = r._id;
      return last;
    }));

  service.get = id => $http.get(`${baseUrl}/${id}`)
    .then(response => response.data);

  return service;
}
