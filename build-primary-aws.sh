#!/bin/bash
node ./primary/index.js optimize
./flush-aws.sh
