#!/bin/bash

counter=0
while ((counter < 100))
do
((++counter))
echo 'Pass ==================' $counter
pkill bedrock1d
sleep 5s
nohup node ./primary/index.js --aws &
sleep 3m
done
