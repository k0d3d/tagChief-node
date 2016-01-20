var PimpCup = require('../../models/device'),
    _ = require('lodash');

module.exports.routes = function (app) {
  //get the summary data for all the widgets on the dashboard
  //
  app.get('/api/v2/questions', function (req, res, next) {
    var pimp_sip = new PimpCup();
    var userId = req.user.email;

    pimp_sip.listQuestionsByParams(userId, req.query.currentGroup)
    .then(function (d) {
      res.json(d);
    });
  });

  app.post('/api/v2/questions', function (req, res, next) {
    var pimply = new PimpCup();
    pimply.insertQuestion(req.user._id, req.body)
    .then(function (r) {
      res.json(r);
    }, function (err) {
      next(err);
    });
  });
};