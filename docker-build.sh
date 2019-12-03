#!/bin/bash
# assumes that docker login has been run out of band
git pull
branchname=$(git symbolic-ref -q HEAD --short)
tag=digitalbazaar/bedrock-ledger-test:${branchname}
docker build -t ${tag} .
docker push ${tag}
