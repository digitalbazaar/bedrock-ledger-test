const eventHashes = require('./event-hashes');
const _ = require('lodash');

console.log('original', eventHashes.length);
console.log('uniq', _.uniq(eventHashes).length);
