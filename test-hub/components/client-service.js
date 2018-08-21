/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

/* @ngInject */
export default function factory($http, $interval) {
  const service = {};
  const baseUrl = '/test-hub';

  service.collection = {
    clients: []
  };

  $interval(() => service.getAll(), 1000);

  service.getAll = () => $http.get(baseUrl).then(response =>
    service.collection.clients = response.data);

  service.removeAll = () => $http.delete(baseUrl);

  return service;
}
