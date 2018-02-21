/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const _ = require('lodash');
const async = require('async');
const bedrock = require('bedrock');
const brAws = require('bedrock-aws');
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
    fields: {id: 1, 'peer.timeStamp': 1},
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

  // peers
  app.get(routes.peers, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => async.auto({
      peers: callback => database.collections['peer-public-addresses']
        .aggregate([
          {$sort: {'peer.timeStamp': 1}},
          {$group: {_id: "$id", last: {$last: "$peer"}}}
        ], callback)
        // .find().toArray((err, result) => {
        //   if(err) {
        //     return callback(err);
        //   }
        //   return callback(null, result.map(p => p.peer));
        // })
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      callback(null, results.peers);
    })
  }));

  // peer history
  app.get(routes.peerHistory, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => async.auto({
      peers: callback => database.collections['peer-public-addresses']
        .find({id: req.params.peerId}, {
          _id: 0, 'peer.label': 1, 'peer.status': 1, 'peer.timeStamp': 1
        }).sort({'peer.timeStamp': -1})
        // .limit(60)
        .toArray((err, result) => {
          if(err) {
            return callback(err);
          }
          return callback(null, result.map(p => p.peer).reverse());
        })
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      callback(null, results.peers);
    })
  }));

  app.post(routes.newNode, brRest.when.prefers.ld, (req, res, next) => {
    const {
      baseUri, label, ledgerNodeId, logGroupName, logUrl, mongoUrl,
      privateHostname, publicHostname, status
    } = req.body;
    console.log('BBBBBBB', JSON.stringify(req.body, null, 2));
    // using the ledgerNodeId as key
    const peerId = database.hash(ledgerNodeId);
    const record = {
      id: peerId,
      peer: {
        baseUri,
        mongoUrl,
        label,
        ledgerNodeId,
        logGroupName,
        logUrl,
        privateHostname,
        publicHostname,
        status,
        timeStamp: Date.now(),
      }
    };
    async.auto({
      store: callback => database.collections['peer-public-addresses']
        .insert(record, database.writeOptions, callback),
      // cloudWatch: ['store', (results, callback) => {
      //   if(results.store.matchedCount === 1) {
      //     // we only want to create log group once
      //     return callback();
      //   }
      //   _setupCloudWatch(logGroupName, callback);
      // }]
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

function _setupCloudWatch(logGroupName, callback) {
  const metricName = `oe-${logGroupName}`;
  async.auto({
    logGroup: callback => {
      cloudWatchLogs.createLogGroup({logGroupName}, () => {
        // ignore error because logGroup may have already been created
        callback();
      });
    },
    metricFilter: ['logGroup', (results, callback) =>
      cloudWatchLogs.putMetricFilter({
        filterName: 'outstanding events',
        filterPattern: '{$.preformatted.outstandingEvents >= 0}',
        logGroupName,
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
      })],
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
      cloudWatch.putDashboard({
        DashboardName: 'LedgerNodes',
        DashboardBody: JSON.stringify(dashboardBody)
      }, callback);
    }]
  }, callback);
}
