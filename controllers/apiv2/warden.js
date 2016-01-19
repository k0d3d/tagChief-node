var DeviceLoc = require('../../models/device'),
    Q = require('q'),
    _ = require('lodash');

module.exports.routes = function (app) {
  //get the summary data for all the widgets on the dashboard
  //
  app.put('/api/v2/warden', function (req, res, next) {
    var loki = new DeviceLoc(), k = [];
    if (req.body.subjectGroup) {
      k[0] = loki.updateSubjectGroup(req.body, req.user._id);
      // loki.updateSubjectGroup(req.body)
      // .then(function (r) {
      //   res.json(r);
      // }, function (err) {
      //   next(err);
      // });
    }

    if (req.body.assignee) {
      k[1] = loki.updateLocationAuthorityClass(req.body, req.user._id);
      // loki.updateLocationAuthorityClass(req.body)
      // .then(function (r) {
      //   res.json(r);
      // }, function (err) {
      //   next(err);
      // });
    }

    Q.all(k)
    .then(function (done) {
      res.json(done);
    }, function (err) {
      next(err);
    });

  });
};