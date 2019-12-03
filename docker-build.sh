#!/bin/bash
# assumes that docker login has been run out of band
tag=digitalbazaar/bedrock-ledger-test:x
docker build -t ${tag} .
docker push ${tag}
