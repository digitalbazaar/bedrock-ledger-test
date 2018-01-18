#!/bin/bash
# clone continuity
cd node_modules
rm -rf bedrock-ledger-consensus-continuity
git clone https://github.com/digitalbazaar/bedrock-ledger-consensus-continuity.git
cd bedrock-ledger-consensus-continuity
git checkout $1
cd ../..
