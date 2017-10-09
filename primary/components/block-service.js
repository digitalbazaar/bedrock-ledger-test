/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

/* @ngInject */
export default function factory($http) {
  const service = {};
  const baseUrl = '/ledger-test/blocks';

  service.getLatest = () => {
    const url = `${baseUrl}/latest`;
    return $http.get(url).then(response => response.data);
  };

  return service;
}
