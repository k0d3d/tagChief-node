var
    appConfig = require('config').express,
    passport = require('passport'),
    cors = require('cors');

module.exports.routes = function (app) {
  appConfig.cors.options.origin = true;
  app.options('/api/v2/*', cors(appConfig.cors.options),
    function (req, res, next) {
      next();
    });

  app.route('/api/v2/*')
  .all(cors(appConfig.cors.options), passport.authenticate('bearer', { session: false }));

  require('./apiv2/users').routes(app);
  require('./apiv2/locations').routes(app);

};