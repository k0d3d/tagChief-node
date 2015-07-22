var User = require('../../models/user');


module.exports.routes = function (app) {
  app.route('/api/v2/users')
  .get(function (req, res, next) {
    var usersModel = new User();

    usersModel.fetchAllUsers(req.query)
    .then(function (users_list) {
      res.json(users_list);
    }, function (err) {
      next(err);
    });
  });
};