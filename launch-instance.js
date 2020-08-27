#!/usr/bin/env node

const uuid = require('uuid-random');
const delay = require('delay');
const {createServer, getServer} = require('./compute-api');
const fs = require('fs');
const path = require('path');

const instanceConfig = fs.readFileSync(
  path.join(__dirname, 'cloud-config-instance.yml'), 'utf8');

(async () => {
  const server = await createServer({
    cloudConfig: Buffer.from(instanceConfig).toString('base64'),
    flavor: '14cb1106-0d17-48d4-9b85-90d743ccae06', // branch-test
    image: '27395632-3a9f-4a62-803a-c5cf0b702ba8', // test-base-mongo4
    name: `continuity-${uuid()}`,
    networks: [{uuid: 'e78a0d0d-dab0-4e9d-b4f1-f451ff32c6a9'}],
    securityGroups: [{name: 'default'}],
  });

  let serverDetails;
  for(let i = 0; i < 60; ++i) {
    serverDetails = await getServer(server.id);
    if(serverDetails.addresses.private) {
      break;
    }
    await delay(1000);
  }
  console.log(serverDetails.addresses.private[0]);
})();

