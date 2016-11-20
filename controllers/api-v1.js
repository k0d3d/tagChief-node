var
  appConfig = require('config').express,
  passport = require('passport'),
  fireman = require('../lib/auth/fireman'),
  cors = require('cors');

module.exports.routes = function(app) {
  appConfig.cors.options.origin = true;
  app.options('/api/v1/*', cors(appConfig.cors.options),
    function(req, res, next) {
      next();
    });

  app.route('/api/v1/*')
  .all(cors(appConfig.cors.options), fireman(),
    // function(req, res, next){
    //   if (
    //     ((req.url == '/api/v1/users' && req.method == 'POST') || (req.url == '/api/v1/users/auth'  && req.method == 'PATCH'))
    //   ) {
    //     next();
    //   } else {
    //     passport.isAPIAuthenticated.call(null, req, res, next);
    //     // next();
    //   }
    // },
    // passport.isAPIAuthenticated,
    function(req, res, next) {
      if (req.xhr) {
        res.set('WWW-Authenticate', 'xBasic realm="Users"');
      }
      next();
    });

  // testing if server is online...
  app.get('/api/v1/routetest', function(req, res) {
    res.json(200, true);
  });
};
