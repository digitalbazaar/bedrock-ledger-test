/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

/* @ngInject */
export default function factory($http) {
  const service = {};
  const baseUrl = '/ledger-test/nodes';

  service.getLatest = (peer, ledgerNodeId) => {
    const url = `${peer}${baseUrl}/${ledgerNodeId}/blocks`;
    return $http.get(url).then(response => response.data);
  };

  return service;
}
