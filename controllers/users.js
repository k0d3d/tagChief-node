var
    jwt = require('jsonwebtoken'),
    appConfig = require('config').express,
    User = require('../models/user.js'),
    _ = require('lodash'),
    util = require('util'),
    Utils = require('../lib/utility'),
    cors = require('cors'),
    passport = require('passport');

module.exports.routes = function (app) {
  var users = new User();

  app.param('userId', function (req, res, next, id) {
    users.findUser(id)
    .then(function (r) {
      req.user = r;
      next();
    })
    .fail(function (err) {
      next(err);
    })
    .done();
  });


  //Authentication Api Routes
  app.route('/api/v1/users/auth')
  .delete(function (req, res, next) {
    res.json(200);
  })
  .patch(function (req, res, next) {
    var users = new User(), u = new Utils();

    var id = u.isEmail(req.body.email) ? {email: req.body.email} : {phoneNumber: req.body.email};
    console.log(id);
    users.findUserObject(id)
    .then(function (userObject) {
      return users.sendPasswordResetMobile(userObject, req.body.deviceId);
    }, function () {
      res.status(404).json(false);
    })
    .then(function () {
      res.json(true);
    }, function (err) {
      next(err);
    });
  })
  .post(function (req, res) {
    if (req.user) {
      var token = jwt.sign(req.user, appConfig.secret);
      // redis_client.hmset(token, req.user);
      res.status(200).json({
        authorizationToken: token
      });
    } else {
      res.status(401).json_({message: 'Authorized only.'});
    }
  });

  //
  //Activities
  //

  //
  //User Profile
  //
  app.route('/api/v1/users')
    //updates the profile for the currently
  //logged in user
  .put(function (req, res, next) {
    console.log(req.body);
    var userId = req.user._id;
    var users = new User();
    users.updateUserAccount(userId, _.extend({scope: 'PROFILE'}, _.pick(req.body, ['firstname', 'lastname', 'phoneNumber'])))
    .then(function (r) {
      res.json(r);
    }, function (err) {
      console.log(err);
      next(err);
    });
  })
  //gets the profile information for the curently logged
  //in user
  .get(function (req, res, next) {
    var userId = req.user._id;
    var users = new User();
    users.getProfile(userId, 'BASIC')
    .then(function (r) {
      res.json(200, r);
      // res.json(200, _.extend(req.user.toJSON(), r));
      // res.render('user/profile', {
      //   userProfile: r || {},
      //   userData: req.user
      // });
    }, function (err) {
      next(err);
    });
  })
  .post(cors(appConfig.cors.options),
    // passport.isAuthAuthenticated,
    function (req, res) {
    var createUser = users.create(req.body);
    createUser.then(function (r) {
      return res.status(200).json(r);
    }, function (err) {
      console.log(err.stack);
      return res.status(400).json(err);
    });
  });

  //logs out a currently logged in user
  // app.delete('/api/v1/users/auth', users.signout);

  // app.param('userId', users.user);
};