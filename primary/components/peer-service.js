/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */

/* @ngInject */
export default function factory($http, $q, brBlockService) {
  const service = {};
  const baseUrl = '/ledger-test/peers';

  service.getAll = () => {
    const promises = [];
    let nodes;
    return $http.get(baseUrl)
      .then(response => {
        nodes = response.data;
        nodes.forEach(node => promises.push(
          brBlockService.getLatest(node.publicHostname, node.ledgerNodeId)));
        return $q.all(promises);
      })
      .then(blocks => {
        nodes.forEach(
          (node, i) => node.latestBlock = blocks[i].eventBlock.block);
        return nodes;
      });
  };

  return service;
}
