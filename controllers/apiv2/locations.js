var LocationsDevices = require('../../models/device');


function list_all_locations (userId, req, res, next) {
    var ld = new LocationsDevices();
    ld.listLocationsByParams(userId, req.query, req.query.listType)
    .then(function (users_list) {
      res.json(users_list);
    }, function (err) {
      next(err);
    });
}

function search_for_location (req, res, next) {
  var ld = new LocationsDevices();
  ld.searchLocations({
    name: req.query.q
  })
  .then(function (results) {
    res.json(results);
  }, function (err) {
    next(err);
  });
}

module.exports.routes = function (app) {

  app.route('/api/v2/locations')
  .get(function (req, res, next) {
    var user = req.user;
    if (req.query.listType === 'list_all_locations') {
      list_all_locations(user, req, res, next);
    }
    if (req.query.listType === 'search') {
      search_for_location(req, res, next);
    }
  });

  app.route('/api/v2/locations/:locationId')
  .get(function (req, res, next) {
    var ld = new LocationsDevices(), task = {};
    var userId = req.user._id;
    switch(req.query.listType) {
      case 'activity':
      task.task = ld.getLocationActivity;
      task.params = [req.params.locationId];
      break;
      case 'checkin':
      task.task = ld.getActivityCheckIn;
      task.params = [req.params.locationId, req.query.cid, req.query];
      break;
      default:
      task.task = ld.getLocationOverview;
      task.params = [req.params.locationId];
      break;
    }
    task.task.apply(this, task.params)
    .then(function (result) {
      return res.json(result);
    }, function (err) {
      next(err);
    });
  });

  app.route('/api/v2/feedback')
  .get(function (req, res, next) {
    var ld = new LocationsDevices();
    ld.getFeedback(req.query)
    .then(function (docs) {
      return res.json(docs);
    }, function (err) {
      return next(err);
    });
  });
};