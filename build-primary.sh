#!/bin/bash
node ./primary/index.js optimize
node ./primary/index.js --minify true --aws
