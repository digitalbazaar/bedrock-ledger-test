/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
import angular from 'angular';
import * as bedrock from 'bedrock-angular';
import HomeComponent from './home-component.js';
import ClientService from './client-service.js';

const module = angular.module('bedrock.ledger-test', [
  'angularMoment', 'ngMaterial', 'md.data.table'
]);

bedrock.setRootModule(module);

module.component('exHome', HomeComponent);
module.service('brClientService', ClientService);

/* @ngInject */
module.config($routeProvider => {
  $routeProvider
    .when('/', {
      title: 'Angular Basic Home',
      template: '<ex-home br-collection="$resolve.collection">' +
        '</ex-home>',
      resolve: {
        collection: brClientService => brClientService.getAll()
          .then(() => brClientService.collection)
      }
    });
});
