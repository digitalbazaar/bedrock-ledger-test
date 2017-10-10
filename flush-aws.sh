#!/bin/bash
mongo flush-mongo.js
node ./primary/index.js --minify true --aws
