  var errors = require('../lib/errors.js'),
      gcm = require('../lib/gcm.js'),
      Q = require('q'),
      Device = require('./media/device'),
      User = require('./user/user'),
      TCLocation = require('./user/locations').TCLocation,
      Review = require('./user/locations').Review,
      Message = require('./message'),
      _ = require('lodash');

var reviewFn = {
  addLocationReview: function addLocationReview (locationId, body) {
      var q = Q.defer();

      var rev = new Review(body);
      rev.locationId = locationId;
      rev.save(function (err, savedDoc) {
        if (err) {
          return q.reject(err);
        }

        if (saveDoc) {
          return q.resolve(saveDoc);
        }
      });
      return q.promise;
  },
  deleteLocationReview: function deleteLocationReview (reviewId) {
      var q = Q.defer();

      Review.remove({
        _id: reviewId
      })
      .exec(function (err, count) {
        if (err) {
          return q.reject(err);
        }

        if (count) {
          return q.resolve(true);
        }

        return q.reject(errors.nounce("RemoveFailed"));
      });
      return q.promise;
  }
}