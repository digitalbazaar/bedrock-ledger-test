/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const config = require('bedrock').config;

config.server.port = 18443;
config.server.httpPort = 18080;
config['ledger-test'].primaryHost = 'ip-172-31-0-137.ec2.internal';