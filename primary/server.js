/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
// const brAws = require('bedrock-aws');
const config = bedrock.config;
const fs = require('fs');
const logger = require('./logger');
const mongoExpress = require('mongo-express/lib/middleware');
const mongoExpressConfig = require('./mongo-express-config');
const os = require('os');
const path = require('path');

let cloudWatch;
let cloudWatchLogs;

// bedrock.events.on('bedrock.start', () => {
//   cloudWatchLogs = new brAws.CloudWatchLogs();
//   cloudWatch = new brAws.CloudWatch();
// });

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
});

/* eslint-disable no-unused-vars */
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
/* eslint-enable */
