var PimpCup = require('../../models/device'),
    _ = require('lodash');

module.exports.routes = function (app) {
  //get the summary data for all the widgets on the dashboard
  //
  app.get('/api/v2/stats', function (req, res, next) {
    var pimp_sip = new PimpCup();
    var userId = req.user._id;
    var res_package = {};

    var oper = 'count_locations';
    pimp_sip.listLocationsByParams(userId, req.query, oper)
    .then(function (d) {
      res_package[oper] = d;
      res.json(res_package);
    }, function (err) {
      next(err);
    });
  });
};