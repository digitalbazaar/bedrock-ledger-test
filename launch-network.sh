#!/usr/bin/env bash

if [ -z "$1" ]
  then
    echo "secondary instance count must be the first argument"
    exit 1
fi
if [ -z "$2" ]
  then
    echo "mongo hostname must be the second argument"
    exit 1
fi


# make array from output of launch-primary.js
networkid=$(uuidgen)
dashboardpublic=$(./launch-dashboard.js -n "${networkid}")
launchoutput=($(./launch-primary.js -m ${2} -n "${networkid}" -d "${dashboardpublic}"))
primaryprivate="${launchoutput[0]}"
primarypublic="${launchoutput[1]}"

if [ $? -ne 0 ]
  then
    echo "error provisioning primary"
    exit 1
fi
echo "NETWORK ID ${networkid}"
echo DASHBOARD
echo "https://${dashboardpublic}:18443"
echo PRIMARY
echo "https://${primarypublic}:18443"
./launch-secondary.js -p "${primaryprivate}" -c $1 -m "${2}" -n "${networkid}" -d "${dashboardpublic}"
if [ $? -ne 0 ]
  then
    echo "error provisioning secondaries"
    exit 1
fi
echo "secondaries launched successfully"

eventclientpublic="$(./launch-event-client.js --primary ${primaryprivate} -n "${networkid}")"
if [ $? -ne 0 ]
  then
    echo "error provisioning event client"
    exit 1
fi
echo CLIENT
echo "https://${eventclientpublic}:18443"
echo
