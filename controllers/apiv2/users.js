var User = require('../../models/user');
var _ = require('lodash');

module.exports.routes = function (app) {
  app.route('/api/v2/users')
  .post(function (req, res, next){
    var user = new User();
    user.createSkeletonUser(req.body)
    .then(function (d){
      res.json(d);
    }, function (err) {
      next(err);
    });
  })
  .get(function (req, res, next) {
    var usersModel = new User();

    usersModel.fetchAllUsers(req.query)
    .then(function (users_list) {
      res.json(users_list);
    }, function (err) {
      next(err);
    });
  });

  app.route('/api/v2/users/me')
    //updates the profile for the currently
  //logged in user
  .get(function (req, res, next) {
    var userId = req.user._id;
    var users = new User();
    users.findUserObject({'_id': userId})
    .then(function (r) {
      res.json(r);
    }, function (err) {
      next(err);
    });
  });
  app.route('/api/v2/users/:userId')
    //updates the profile for the currently
  //logged in user
  .put(function (req, res, next) {
    var userId = req.user._id;
    var users = new User();
    users.updateUserAccount(userId, _.extend({scope: 'PROFILE'}, req.body))
    .then(function (r) {
      res.json(r);
    }, function (err) {
      next(err);
    });
  });

};