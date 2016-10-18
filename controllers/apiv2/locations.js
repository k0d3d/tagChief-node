var LocationsDevices = require('../../models/device'),
    upload = require('multer')({'dest': 'assets/'}),
    fs = require('fs'),
    path = require('path');


function list_all_locations (userId, req, res, next) {
    var ld = new LocationsDevices();
    ld.listLocationsByParams(
      userId, 
      req.query, 
      req.query
    )
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
    // fetches all locations
    if (req.query.listType === 'list_all_locations') {
      list_all_locations(user, req, res, next);
    }
    if (req.query.listType === 'search') {
      search_for_location(req, res, next);
    }
  });

  app.route('/api/v2/locations/:locationId/assets/:filename')
  .get(function (req, res, next) {
    res.json({});
  })
  .post(upload.single('location_asset'), function (req, res, next) {
    var newfilename = req.file.originalname + req.file.filename + Date.now() + '.jpg';
    fs.rename(path.join(req.file.path), path.join(req.file.destination, newfilename), function () {

      res.json({filename: newfilename});
    });

  });
  app.route('/api/v2/locations/:locationId')
  .get(function (req, res, next) {
    var ld = new LocationsDevices(), task = {};
    var userId = req.user._id;
    switch(req.query.listType) {
      // this should call the method that fetches
      // all the activities belonging to a location
      // these activities have to be filtered to
      // contain only results from locations that
      // the currently logged in user is.
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
  // app.route('/api/v2/locations/:locationId/questions')
  // .get(function (req, res, next) {
  //   var ld = new LocationsDevices();
  //   //seek the
  // });

  app.route('/api/v2/feedback')
  .get(function (req, res, next) {
    var ld = new LocationsDevices();
    // this will attempt to get all feedback records
    // for all locations the currently logged in
    // user is allowed to see.
    // email
    var email = req.user.email;
    ld.getFeedback(email)
    .then(function (docs) {
      return res.json(docs);
    }, function (err) {
      return next(err);
    });
  });
};