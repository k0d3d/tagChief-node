var TCLocations = require('../models/device'),
    errors = require('../lib/errors'),
    GPushMessenger = require('../lib/gcm'),
    // lingua = require('lingua'),
    _ = require('lodash'),
    User = require('../models/user');
    // Reviews = require('../models/reviews');





module.exports.routes = function (app) {

  app.post('/api/v1/hereiam', function (req, res, next) {
    var lingua = res.locals.lingua;
    if (!req.body.coords.latitude || !req.body.coords.longitude) {
      return res.json(400).status(errors.nounce('InvalidParams').toJSON());
    }
    // var us = new User(), coordsInRequest = [3.379816, 6.527044];
    var us = new User(), coordsInRequest = [parseFloat(req.body.coords.longitude), parseFloat(req.body.coords.latitude)];
    us.saveLastSeen(req.user._id,  coordsInRequest)
    .then(function (userData) {
      // res.json(true);
      var dev = new TCLocations();
      dev.listLocationsByParams(req.user._id, coordsInRequest, {
        listType: (req.body.shouldPromptCheckIn ) ? 'CHECKIN' : 'countPlacesNearBy',
        limit: req.body.shouldPromptCheckIn || 1
      })
      .then(function (locationList) {
        return res.json(locationList[0]);
        //should send push notifications
        if (locationList.length) {

          var regIds = [req.get('GCMId')];
          var gPush = new GPushMessenger(regIds);
          gPush.queueMessage(
            lingua.checkIntoLocation.title({locationName: locationList[0].name}),
            lingua.checkIntoLocation.body,
            // _.pluck(locationList, 'name').slice(0 , 2).join(", ") + "...",
            // 'Check In to Any of These',
            'CHECKIN'
          );
          gPush.currentGCMObject.addData('locationId', locationList[0]._id);
          gPush.currentGCMObject.addData('locationName', locationList[0].name);
          // console.log(gPush.messageQueue);
          // return true;
          gPush.sendMessage(function () {
            console.log('push sent');
            // res.json(true);
          });

        } else {
         console.log('No Locations Found');
         res.status(200).json([]);
        }
      }, function (err) {
        next(err);
      });
      // res.status(200).json(userData);
    }, function (err) {
      console.log(err);
      next(err);
    });
  });

  app.post('/api/v1/locations', function (req, res, next) {
    var dev = new TCLocations();
    dev.addTagLocation(req.body, req.user._id)
    .then(function () {
      return res.status(200).json(true);
    }, function (err) {
      next(err);
    });
  });

  app.route('/api/v1/locations/:locationId')
  .get(function (req, res, next) {
    console.log('thisfat');
    var dev = new TCLocations();
    dev.getOneLocation(req.params.locationId)
    .then(function (ld) {
      return res.json(ld);
    }, function (err) {
      console.log(err);
      return next(err);
    });
  })
  .put(function (req, res, next) {
    var dev = new TCLocations(), task;
    switch (req.query.action) {
      case 'CHECKIN':
      task = dev.checkIntoLocation(req.body.deviceId, req.params.locationId, req.user._id);
      break;
      case 'UPDATECHECKIN':
      task = dev.updateCheckInRecord(req.body, req.params.locationId, req.user._id);
      break;
      default:
      break;
    }

    task
    .then(function (checkInId) {
      res.json(checkInId);
    }, function (err) {
      console.log(err);
      next(err);
    });
  });


  //this should load locations,
  //some locations could be based on proximity,
  //some based on locations the user has checked into
  app.get('/api/v1/locations', function (req, res, next) {
    var dev = new TCLocations();
    if (!req.query.lat || !req.query.lon) return next(errors.nounce('InvalidParams'));
    dev.listLocationsByParams(req.user._id, [parseFloat(req.query.lon), parseFloat(req.query.lat)], {
      limit: req.query.loadPerRequest,
      maxDistance: req.query.maxDistance || 1
    })
    .then(function (locationList) {
      //should send push notifications
     res.status(200).json(locationList);
    }, function (err) {
      next(err);
    });
  });
  //this should load locations,
  //some locations could be based on proximity,
  //some based on locations the user has checked into
  app.get('/api/v1/position', function (req, res, next) {
    var dev = new TCLocations();
    dev.whatsAroundMe(req.user._id, [parseFloat(req.query.lon), parseFloat(req.query.lat)], {
      limit: req.query.loadPerRequest,
      maxDistance: req.query.maxDistance || 1
    })
    .then(function (locationList) {
      //should send push notifications
     res.status(200).json(locationList);
    }, function (err) {
      console.log(err);
      next(err);
    });
  });
};