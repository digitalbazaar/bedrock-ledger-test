#!/bin/bash
# clone continuity
cd node_modules
rm -rf bedrock-ledger-consensus-continuity
cd bedrock-ledger-consensus-continuity
git checkout $1
cd ../..
