/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
import angular from 'angular';
import * as bedrock from 'bedrock-angular';

const module = angular.module('bedrock.ledger-test', [
  'bedrock.ledger-test-dashboard'
]);

bedrock.setRootModule(module);

/* @ngInject */
module.config($routeProvider => {
  $routeProvider
    .when('/', {
      title: 'Bedrock Ledger Test Dashboard',
      template:
        '<brlt-dashboard brlt-collection="$resolve.collection">' +
        '</brlt-dashboard>',
      resolve: {
        collection: (brltPeerService) => brltPeerService.collection
      }
    });
});
