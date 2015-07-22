var Device = require('../models/device'),
    GPushMessenger = require('../lib/gcm');

module.exports.routes = function (app) {
  var device = new Device();
  app.route('/api/v1/messaging/:deviceId')
  .post(function (req, res, next) {
    var deviceId = req.params.deviceId;
    var regId = req.get('GCMId');
    //should check if the device is a new one on Tagchief,
    //then register it if it is,
    //then store the registrationid .
    //else just update the last seen field
    if (regId) {
      //checking for device
      device.registerOrUpdateGCMDevice(regId, deviceId, req.user._id)
      .then(function () {

        res.json(1);

      }, function (err) {
        next(err);
      });
    } else {
      res.status(400).json({'message': 'Invalid Request Param Size'});
    }
  });
  // .delete(function (req, res, next) {

  // })
  // .put(function (req, res, next) {

  // });

  app.route('/api/v1/messaging/:deviceId/test')
  //checks if the device is registered on tagChief and pushes
  //the result
  .post(function (req, res, next) {
    var deviceId = req.params.deviceId;
    var regId = req.get('GCMId');
    var lingua = res.locals.lingua;
    if (regId) {
      //checking for device
      device.registerOrUpdateGCMDevice(regId, deviceId, req.user._id)
      .then(function () {
              var regIds = [regId];
              var gPush = new GPushMessenger(regIds);
              gPush.queueMessage(
                lingua.testGCM.title,
                lingua.testGCM.body,
                // _.pluck(locationList, 'name').slice(0 , 2).join(", ") + "...",
                // 'Check In to Any of These',
                'TESTINGGCM'
              );
              // console.log(gPush.messageQueue);
              // return true;
              gPush.sendMessage(function () {
                console.log('push sent');
                res.json(true);
              });
      }, function (err) {
        next(err);
      });
    } else {
      res.status(400).json({'message': 'Invalid Request Param Size'});
    }
  });
};