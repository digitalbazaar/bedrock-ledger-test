#!/bin/bash
mongo flush-mongo.js
redis-cli flushall
node ./primary/index.js
