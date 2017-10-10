#!/bin/bash
mongo flush-mongo.js
node ./primary/index.js
