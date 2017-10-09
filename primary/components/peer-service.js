/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

/* @ngInject */
export default function factory($http) {
  const service = {};
  const baseUrl = '/ledger-test/peers';

  service.getAll = () => $http.get(baseUrl).then(response => response.data);

  return service;
}
