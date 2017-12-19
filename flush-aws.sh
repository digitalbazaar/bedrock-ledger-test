#!/bin/bash
echo "Deleting logs..."
rm /tmp/bedrock-ledger-test/*.log
echo "Flushing mongodb..."
mongo flush-mongo.js
node ./primary/index.js --minify true --aws
