#!/bin/bash
node index.js optimize
NODE_ENV=production node index.js --aws
