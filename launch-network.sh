#!/usr/bin/env bash

if [ -z "$1" ]
  then
    echo "secondary instance count must be the first argument"
    exit 1
fi

# make array from output of launch-primary.js
launchoutput=($(./launch-primary.js))
primaryprivate="${launchoutput[0]}"
primarypublic="${launchoutput[1]}"

if [ $? -ne 0 ]
  then
    echo "error provisioning primary"
    exit 1
fi
echo PRIMARY
echo "https://${primarypublic}:18443"
./launch-secondary.js --primary "${primaryprivate}" --count $1
if [ $? -ne 0 ]
  then
    echo "error provisioning secondaries"
    exit 1
fi
echo "secondaries launched successfully"

eventclientpublic="$(./launch-event-client.js)"
if [ $? -ne 0 ]
  then
    echo "error provisioning event client"
    exit 1
fi
echo CLIENT
echo "https://${eventclientpublic}:18443"
