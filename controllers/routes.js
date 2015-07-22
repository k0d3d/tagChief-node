/**
 * Module dependcies
 */
var jwt = require('jsonwebtoken');


/**
 * Expose routes
 */

module.exports = function (app) {

  require('./api-v1').routes(app);
  require('./api-v2').routes(app);

  require('./pushes').routes(app);
  require('./users').routes(app);
  require('./locations').routes(app);


  //load the oauth routes
  require('./oauth-server/oauth-server').routes(app);

};