/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const os = require('os');
require('bedrock-stats');

bedrock.events.on('bedrock-stats.report', async ({monitors}) => {
  monitors.nodeOs = {loadAvg: os.loadavg()};
});
