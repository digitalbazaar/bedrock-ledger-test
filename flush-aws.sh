#!/bin/bash
echo "Deleting logs..."
rm /tmp/bedrock-ledger-test/*.log
echo "Flushing mongodb..."
mongo flush-mongo.js
echo "Flushing redis..."
redis-cli flushall
node ./primary/index.js --aws
