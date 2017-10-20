/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brAws = require('bedrock-aws');
const brLedgerNode = require('bedrock-ledger-node');
const brRest = require('bedrock-rest');
const config = bedrock.config;
const database = require('bedrock-mongodb');
const fs = require('fs');
const ledger = require('./ledger');
const logger = require('./logger');
const mongoExpress = require('mongo-express/lib/middleware');
const mongoExpressConfig = require('./mongo-express-config');
const os = require('os');
const path = require('path');
const randomWords = require('random-words');
let request = require('request');
request = request.defaults({json: true, strictSSL: false, timeout: 5000});

let cloudWatch;
let cloudWatchLogs;

bedrock.events.on('bedrock.start', () => {
  cloudWatchLogs = new brAws.CloudWatchLogs();
  cloudWatch = new brAws.CloudWatch();
});

bedrock.events.on('bedrock-mongodb.ready', callback => async.auto({
  open: callback => database.openCollections(
    ['peer-public-addresses'], callback),
  index: ['open', (results, callback) => database.createIndexes([{
    collection: 'peer-public-addresses',
    fields: {publicHostname: 1},
    options: {unique: true, background: false}
  }], callback)]
}, callback));

bedrock.events.on('bedrock-express.configure.routes', app => {
  const routes = config['ledger-test'].routes;

  app.use(routes.mongoExpress, mongoExpress(mongoExpressConfig));

  app.get(routes.logFile, (req, res, next) => fs.readFile(
    path.join(os.tmpdir(), 'bedrock-ledger-test', `${req.params.logFile}.log`),
    {encoding: 'utf8'}, (err, data) => {
      if(err) {
        return next(err);
      }
      res.setHeader('content-type', 'text/plain');
      res.send(data);
    }));

  // genesis block
  app.get(routes.genesis, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => ledger.agent.node.blocks.getGenesis(
      (err, result) => callback(err, result.genesisBlock.block))
  }));

  // latest block
  app.get(routes.blocks, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => async.auto({
      ledgerNode: callback =>
        brLedgerNode.get(null, req.params.ledgerNodeId, callback),
      latest: ['ledgerNode', (results, callback) =>
        results.ledgerNode.storage.blocks.getLatestSummary(callback)],
      eventsTotal: ['ledgerNode', (results, callback) =>
        results.ledgerNode.storage.events.getCount(callback)],
      eventsOutstanding: ['ledgerNode', (results, callback) =>
        results.ledgerNode.storage.events.getCount(
          {consensus: false}, callback)],
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      callback(null, {
        latestBlock: results.latest,
        events: {
          total: results.eventsTotal,
          outstanding: results.eventsOutstanding
        }
      });
    })
  }));

  // peers
  app.get(routes.peers, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => async.auto({
      peers: callback => database.collections['peer-public-addresses']
        .find().toArray(callback),
      block: ['peers', (results, callback) => async.map(
        results.peers, (peer, callback) => {
          const baseUrl = '/ledger-test/nodes';
          const url = `https://${peer.privateHostname}:18443${baseUrl}/` +
            `${peer.ledgerNodeId}/blocks`;
          request.get(url, (err, result) => {
            if(err) {
              return callback(err);
            }
            peer.latestBlock = result.body.latestBlock.eventBlock.block;
            peer.events = result.body.events;
            callback(null, peer);
          });
        }, callback)]
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      callback(null, results.block);
    })
  }));

  app.post(routes.newNode, brRest.when.prefers.ld, (req, res, next) => {
    const metricName = `oe-${req.body.logGroupName}`;
    async.auto({
      store: callback => database.collections['peer-public-addresses'].insert({
        peer: `https://${req.body.publicIp}:18443/mongo`,
        label: `${req.body.label}-${randomWords()}`,
        ledgerNodeId: req.body.ledgerNodeId,
        log: `https://${req.body.publicIp}:18443/log/app`,
        logGroupName: req.body.logGroupName,
        privateHostname: req.body.privateHostname,
        publicHostname: req.body.publicHostname,
        startTime: Date.now()
      }, database.writeOptions, callback),
      logGroup: callback => cloudWatchLogs.createLogGroup({
        logGroupName: req.body.logGroupName
      }, () => {
        // ignore error because logGroup may have already been created
        callback();
      }),
      metricFilter: ['logGroup', (results, callback) => {
        cloudWatchLogs.putMetricFilter({
          filterName: 'outstanding events',
          filterPattern: '{$.preformatted.outstandingEvents >= 0}',
          logGroupName: req.body.logGroupName,
          metricTransformations: [{
            metricName,
            metricNamespace: 'ledger-test',
            metricValue: '$.preformatted.outstandingEvents'
          }]
        }, (err, result) => {
          if(err) {
            logger.error('Error creating CloudWatch metric filter.', err);
            return callback(err);
          }
          logger.debug('Successfully created CloudWatch metric filter.');
          callback(null, result);
        });
      }],
      dashboardBody: callback => cloudWatch.getDashboard({
        DashboardName: 'LedgerNodes'
      }, (err, result) => {
        if(err) {
          console.log('Dashboard does not exist.', err);
          return callback();
        }
        callback(null, JSON.parse(result.DashboardBody));
      }),
      dashboard: ['dashboardBody', 'metricFilter', (results, callback) => {
        const dashboardBody = results.dashboardBody || {
          widgets: [{
            type: 'metric',
            x: 0,
            y: 0,
            width: 18,
            height: 6,
            properties: {
              view: 'timeSeries',
              stacked: false,
              metrics: [],
              period: 60,
              region: 'us-east-1',
              title: 'Outstanding Events'
            }
          }]
        };
        dashboardBody.widgets[0].properties.metrics.push([
          'ledger-test', metricName, {period: 60}
        ]);
        console.log('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ');
        console.log(JSON.stringify(dashboardBody, null, 2));
        console.log('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ');
        cloudWatch.putDashboard({
          DashboardName: 'LedgerNodes',
          DashboardBody: JSON.stringify(dashboardBody)
        }, callback);
      }]
    }, err => {
      // pass success if duplicate
      if(err && !database.isDuplicateError(err)) {
        logger.error('Error storing node information.', err);
        return next(err);
      }
      res.status(200).end();
    });
  });
});
