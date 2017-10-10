#!/bin/bash
rm -rf ./node_modules /tmp/bedrock-ledger-test
npm install
./build-primary-aws.sh
