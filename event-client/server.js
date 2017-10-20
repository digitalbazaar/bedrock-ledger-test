const bedrock = require('bedrock');
const brRest = require('bedrock-rest');
const config = bedrock.config;
const database = require('bedrock-mongodb');

bedrock.events.on('bedrock-express.configure.routes', app => {
  const routes = config['ledger-test'].routes;

  app.get(routes.agents, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => database.collections.ledgerAgent.find()
      .toArray(callback)
  }));

  app.post(routes.eventNum, (req, res, next) => {
    const query = {
      id: database.hash(req.params.agentId)
    };
    const update = {
      $set: {'meta.eventsPerSec': req.body.eventsPerSec}
    };
    database.collections.ledgerAgent.update(query, update, err => {
      console.log('EEEEEEEEE', err);
      if(err) {
        return next(err);
      }
      res.end();
    });
  });

});
