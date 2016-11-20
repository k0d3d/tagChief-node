/**
 * locations on tagchief are split into two kinds.
 * you have the system locations, which are added
 * from imports and google place locations which.
 * @type {[type]}
 */
  var errors = require('../lib/errors.js'),
      GPushMessenger = require('../lib/gcm.js'),
      GooglePlaces = require('googleplaces'),
      Q = require('q'),
      Device = require('./media/device'),
      User = require('./user').UserModel,
      TCLocation = require('./user/locations').TCLocation,
      CheckLog = require('./user/locations').CheckLog,
      Questions = require('./user/locations').Questions,
      FeedBackAnswers = require('./user/locations').FeedBackAnswer,
      Message = require('./message'),
      _ = require('lodash');



var deviceFn = {
  recur_add: function recur_add (gLocationArray, cb) {
        var g = gLocationArray.pop(),
            self = this;
        TCLocation.update({
          google_place_id: g.place_id
        }, {
          $set: {
            name: g.name,
            category: g.types[0],
            coords: [g.geometry.location.lng, g.geometry.location.lat],
            tags: g.types,
            longitude: g.geometry.location.lng,
            latitude: g.geometry.location.lat,
            lon: g.geometry.location.lng,
            lat: g.geometry.location.lat,
            address: g.vicinity,
            state: g.vicinity,
            google_place_id: g.place_id,
            entry_type: 'system'
          },
        }, {upsert: true})
        .exec(function (err, d) {
          if (err) {
            console.log(err);
          }
          if (gLocationArray.length) {
            self.recur_add(gLocationArray, cb);
          } else {
            cb();
          }
        });
  },
  deleteQuestion: function deleteQuestion (params) {
    var q = Q.defer(), k = {};

    k._id = params.id;
    k.assignee = params.assignee;
    if (params.author) {
      k.author = params.author;
    }
    Questions.remove(k)
    .exec(function(err, d) {
      if (err) {
        return q.reject(err);
      }
      if (!d) {
        return q.reject(new Error('OperationalError'))
      }
      if (d) q.resolve(d);
    });


    return q.promise;
  },
  listQuestionsByParams: function listQuestionsByParams (params) {
    var q = Q.defer();
    params = params || {};

    Questions.find(params)
    .exec(function (err, m) {
      if (err) {
        return q.reject(err);
      }

      q.resolve(m);
    });

    return q.promise;
  },
  recur_location_fetch: function recur_location_fetch (docs, popped, cb) {
    var ob = docs.pop();
    ob = ob.toObject();
    popped = (popped && popped.length) ? popped : [];
    deviceFn.findALocationById(ob.checkInId.locationId)
    .then(function (loc) {
      ob.locationData = loc;
      popped.push(ob);
      if (docs.length) {
        deviceFn.recur_location_fetch(docs, popped, cb);
      } else {
        return cb(popped);
      }
    }, function (err) {
      console.log(err);
      if (docs.length) {
        deviceFn.recur_location_fetch(docs, popped, cb);
      } else {
        return cb(popped);
      }
    });
  },
  queryFeedback: function queryFeedback (params) {
    params = params || {};
    var q = Q.defer();
    FeedBackAnswers.find(params)
    .limit(30)
    .populate({path: 'checkInId', model: 'Checklog'})
    .populate({path: 'locationId', model: 'Location'})
    .exec(function (err, docs) {
          if (err) {
            return q.reject(err);
          }
          if (!docs) {
            return q.reject(errors.nounce('DocumentNotFound'));
          }

          if(docs.length) {
            return q.resolve(docs);
            deviceFn.recur_location_fetch(docs, [], function (poppedDoc) {
              console.log('done popping');
              return q.resolve(poppedDoc);
            });

          } else {
            return q.resolve([]);
          }
    });
    return q.promise;
  },
  findLocationsByMe: function findLocationsByMe (userId){
    var q = Q.defer();
    TCLocation.find({
      'authority.userId' : userId
    }, 'name')
    .exec(function (err, docs) {
      if (err) {
        return q.reject(err);
      }
      q.resolve(docs);
    });

    return q.promise;
  },
  allLocationFeedback: function allLocationFeedback (params) {
    var q = Q.defer();

    FeedBackAnswers.find({
      locationId: params.locationId
    })
    .sort({'timeUpdated': -1})
    .exec(function (err, d) {
      if (err) {
        return q.reject(err);
      }
      return q.resolve(d);
    })


    return q.promise;
  },
  findCheckInFeedback: function findCheckInFeedback (params) {
    var q = Q.defer();
    FeedBackAnswers.find({
      // checkInId: "55b10250d0d09a0300366da8"
      checkInId: params.checkInId
    })
    .populate({path: 'checkInId', model: 'Checklog'})
    .populate({path: 'checkInId.userId', model: 'User'})
    .populate({path: 'checkInId.locationId', model: 'Location'})
    .exec(function (err, docs) {
          if (err) {
            return q.reject(err);
          }
          if (!docs) {
            return q.reject(errors.nounce('DocumentNotFound'));
          }
          return q.resolve(docs);
    });

    return q.promise;
  },
  query: function query (str) {
    var q = Q.defer();

    TCLocation.find({
      name: new RegExp(str, 'i')
    })
    .limit(20)
    .exec(function (err, docs) {
      if (err) {
        return q.reject(err);
      }
      q.resolve(docs);
    });
    return q.promise;
  },
  saveUserLastTaggedLocation : function saveUserLastTaggedLocation (userId, locationId) {
      var user = new User();
      return user.saveUserLastTaggedLocation(userId, locationId);
  },
  /**
   * adds a new location data to TC
   * @param {[type]} userId the author of the location/ first person to tag here
   * @param {[type]} body   Object with properties of the location.
   */
  addNewLocation : function addNewLocation (userId, body) {
      var q = Q.defer();
      var coords = [parseFloat(body.lon), parseFloat(body.lat)];
      if (coords.length < 2) {
        q.reject(new Error('Coords not available. Tagging Aborted'));
        return q.promise;
      }
      var l = new TCLocation(body);
      l.coords =  coords;
      l.longitude = body.lon;
      l.latitude = body.lat;
      l.author = userId;
      l.entry_type = 'user';
      l.authority.push(
          {
              'userId' : 'super.user@tagchief.com.ng',
              'author' :userId,
          }
      );
      l.save(function (err, saveDoc) {
        if (err) {
          return q.reject(err);
        }

        if (saveDoc) {
          return q.resolve(saveDoc);
        }
      });
      return q.promise;
  },
  /**
   * reduced the mark / score of a location's verified counts by 1.
   * when a user tags an already existing location, this count is incremented.
   * if a user, does not agree with the data properties of that location, user can
   * discount this location entry. Location lookups are ordered by their verified counts
   * @param  {ObjectId} locationId Location ID
   * @return {[type]}            [description]
   */
  discountTaggedLocation: function discountTaggedLocation (locationId) {
      var q = Q.defer();

      TCLocation.update({
        _id: locationId
      }, {
        $inc: {
          verififiedCounts: -1
        }
      }, function (err, count) {
        if (err) {
          return q.reject(err);
        }

        if (count) {
          return q.resolve(true);
        }
      });
      return q.promise;
  },
    /**
   * increases the mark / score of a location's verified counts by 1.
   * when a user tags an already existing location, this count is incremented.
   * if a user, does not agree with the data properties of that location, user can
   * discount this location entry. Location lookups are ordered by their verified counts
   * @param  {ObjectId} locationId Location ID
   * @return {[type]}            [description]
   */
  countTaggedLocation: function countTaggedLocation (locationId) {
      var q = Q.defer();

      TCLocation.update({
        _id: locationId
      }, {
        $inc: {
          verififiedCounts: 1
        }
      }, function (err, count) {
        if (err) {
          return q.reject(err);
        }

        if (count) {
          return q.resolve(true);
        }
      });
      return q.promise;
  },
  /**
   * shows / looks up locations close to geoCoords
   * @param  {[type]} geoCords [description]
   * @param  {[type]} query    [description]
   * @return {[type]}          [description]
   */
  inProximity : function inProximity ( geoCoords, query) {
      var q = Q.defer(),
          limit = query.limit || 10,
          page = query.page || 0,
          // maxDistance = query.maxDistance || 0.9;
          maxDistance = query.maxDistance || 0.29;
          maxDistance = maxDistance/111.12; // correct value

      if (geoCoords.length !== 2) {
        return q.reject(errors.nounce('InvalidParams'));
      }

      var googlePlaces = new GooglePlaces('AIzaSyCOt9IYHpYN22m7alw_HKi5y5WBgu57p4s', 'json');
      googlePlaces.placeSearch({
        location: [geoCoords[1], geoCoords[0]],
        types: "atm|gas_station"
      }, function (error, response) {
          // if (error) throw error;
          // if no errors are found and the response 
          // contains a results . Use the recursive 
          // function recur_add to add the found results
          // from google to our database. 
          if (!error && response && response.status === 'OK' && response.results.length) {

            deviceFn.recur_add(response.results, function () {

              TCLocation.find({
                entry_type: 'system',
                coords: {
                  "$near": geoCoords,
                  "$maxDistance": maxDistance
                }
              })
              .limit(limit)
              .skip(limit * page)
              .exec(function (err, locations) {
                if (err) {
                  return q.reject(err);
                }

                if (locations.length) {

                  return q.resolve(locations);
                }
                return q.resolve([]);
              });
            });
          } else {
              TCLocation.find({
                entry_type: 'system',
                coords: {
                  "$near": geoCoords,
                  "$maxDistance": maxDistance
                }
              })
              .limit(limit)
              .skip(limit * page)
              .exec(function (err, locations) {
                if (err) {
                  return q.reject(err);
                }

                if (locations.length) {

                  return q.resolve(locations);
                }
                return q.resolve([]);
              });
          }
          // console.log(response);
      });

      return q.promise;
  },
  findALocationById: function findALocationById (locationId) {
      var q = Q.defer();

      TCLocation.findOne({
        _id: locationId
      })
      .exec(function (err, l) {
        if (err) {
          return q.reject(err);
        }

        if (l) {
          return q.resolve(l);
        }

        q.reject(new Error('DocumentNotFound'));
      });
      return q.promise;
  },
  /**
   * adds / creates a record of a check-in by a user
   * @param {[type]} params [description]
   */
  addACheckInRecord: function addACheckInRecord (params) {
      var q = Q.defer();
      var checkIndo = new CheckLog(params);

      checkIndo.save(function (err, saveDoc) {
        if (err) {
          return q.reject(err);
        }

        return q.resolve(saveDoc);
      });

      return q.promise;
  },
  /**
   * find a check-in record created by a specific user.
   * @param  {[type]} checkInId [description]
   * @param  {[type]} userId    [description]
   * @return {[type]}           [description]
   */
  findACheckInEntry: function findACheckInEntry (checkInId, userId) {
      var q = Q.defer();

      CheckLog.findOne({
        _id: checkInId,
        userId: userId
      })
      .exec(function (err, doc){
        if (err) {
          return q.reject(err);
        }
        if (!doc) {
          return q.reject(errors.nounce('DocumentNotFound'));
        }

        return q.resolve(doc);
      });

      return q.promise;
  },
  /**
   * updates an existing check-in entry. Expects a check-in
   * mongo objectId or a mongodb / mongoose document object.
   * This adds the checkout time for now.
   * @param  {[type]} mongoDoc [description]
   * @return {[type]}          [description]
   */
  updateACheckInEntry: function updateACheckInEntry (mongoDocOrId) {
      var q = Q.defer();

      if (_.isString(mongoDocOrId)) {
        CheckLog.update({
          _id: mongoDocOrId
        }, {
          $set: {
            checkOutTime: Date.now()
          }
        }, function (err, i) {
          if (err) {
            return q.reject(err);
          }
          if (!i) {
            return q.reject(errors.nounce('UpdateFailed'));
          }

          return q.resolve(i);
        });
      } else {
        mongoDocOrId.checkOutTime = Date.now();
        mongoDocOrId.save(function (err, doc) {
          if (err) {
            return q.reject(err);
          }
          if (!doc) {
            return q.reject(errors.nounce('UpdateFailed'));
          }

          return q.resolve(doc);
        });
      }

      return q.promise;
  },
  countLocationsByParams: function countLocationsByParams (params) {
    var q = Q.defer();

    params = params || {};
    var dbQuery = TCLocation.count();

    dbQuery.exec(function (err, docs) {
      if (err) {
        return q.reject(err);
      }
      return q.resolve(docs);
    });

    return q.promise;
  },
  /**
   * this method queries database records for locations that
   * match the criteria in the 'params' argument.
   * @param  {Object} params key/ value object containing
   * fields and conditions that create the fetch criteria.
   * @return {Promise}        [description]
   */
  fetchLocationsByParams: function fetchLocationsByParams (params) {
    var q = Q.defer(),
    conditions = {};


    params = params || {};

    try {
      conditions = JSON.parse(params.conditions);
      params.search_query = JSON.parse(params.search_query);
    } catch (e) {
      //empty, so do nothing
    }

    if (params.category) {
      conditions.category = params.category;
    }

    if (params.name) {
      conditions.name = {
        '$regex': new RegExp(params.name, 'i')
      };
    }
    var maxDistance = params.maxDistance || 0.90;
    if (params.lat && params.lng) {
      conditions.coords ={
        $near:[params.lng, params.lat],
        $maxDistance : maxDistance/111.12
      };

    }
    var dbQuery = TCLocation.find(conditions);

    dbQuery.limit(params.rpp || 100);
    if (params.page) {
      dbQuery.skip(params.page * params.rpp);
    }
    if (params.entry_type) {
      dbQuery.where('entry_type', params.entry_type);
    } else {
      dbQuery.where('entry_type', 'user');
    }

    if (params.assignee) {
      dbQuery.where('authority.userId', params.assignee);
    }

    dbQuery.sort({dateAdded: -1});
    var populate_str = {path: 'author', select: 'email', model: 'User'};
    //find entries by specific accounts
    if (params.author) {
      populate_str.match = {'email' : new RegExp(params.author, 'i')};
    }
    dbQuery.populate(populate_str);
    dbQuery.exec(function (err, docs) {
      if (err) {
        return q.reject(err);
      }
      return q.resolve(docs);
    });

    return q.promise;
  },
  create_child_location: function create_child_location (params) {
    var q = Q.defer();

    // var dbQuery = new TCLocation();
    // dbQuery.

    return q.promise;
  },
  /**
   * fetches all the check-ins that
   * have been generated on one location.
   * The query can be filtered by passing
   * an object in query property of params
   * argument.
   * @param  {[type]} params An object with the locationId and a query
   * to filter the results.
   * @return {[type]}        [description]
   */
  fetchLocationCheckInRecords: function fetchLocationCheckInRecords (params) {
    var q = Q.defer();
    params = params || {};

    var dbQuery = CheckLog.find({
      locationId: params.locationId
    });
    // dbQuery.limit(params.rpp || 20);
    dbQuery.limit(5);
    if (params.page) {
      dbQuery.skip(params.page * params.rpp);
    }
    dbQuery.sort({checkInTime: -1});
    dbQuery.populate({path: 'locationId', model: 'Location'});
    dbQuery.populate({path: 'userId', model: 'User', select: 'email firstname lastname phoneNumber'});
    dbQuery.exec(function (err, docs) {
      if (err) {
        return q.reject(err);
      }
      return q.resolve(docs);
    });
    return q.promise;
  },
  /**
   * changes or removes something done by addLocationtoGroupClass.
   * Adds or changes the group a location belongs to. If the location
   * already belongs to an existing group. it can be overwritten.
   *
   *
   * @param  {[type]} params [description]
   * @return {[type]}        [description]
   */
  addLocationtoGroupClass: function addLocationtoGroupClass (params) {
    var q = Q.defer();

    params = params || {};

    TCLocation.update({
      '_id': params.locationId,
      'authority.userId': params.assignee,
      'entry_type': 'user'
    }, {
      $set: {
        'feedback_group': params.subjectGroup,
      }
    }, {upsert: true}, function (err, n) {
      if (err) {
        return q.reject(err);
      }
      if (n.count) {
        return q.resolve(true);
      }
      q.reject(new Error ('update failed'));
    });


    // TCLocation.findOne({
    //   '_id': params.locationId,
    //   'entry_type': 'user',
    //   'authority.userId': params.assignee
    // })
    // .exec(function (err, doc) {
    //   if (err) {
    //     return q.reject(err);
    //   }
    //   //update an existing
    //   if (doc) {
    //     doc.feedback_group = params.subjectGroup;
    //     doc.save(function (err) {
    //       if (err) {
    //         return q.reject(err);
    //       }
    //       q.resolve();
    //     });
    //   }
    //   //create a new one
    //   else {
    //     //find a match

    //   }
    // });


    return q.promise;
  },
  /**
   * changes or removes something done by addLocationAuthorityClass
   * @param  {[type]} params [description]
   * @return {[type]}        [description]
   */
  modifyLocationAuthorityClass: function modifyLocationAuthorityClass (params) {
    var q = Q.defer();

    params = params || {};
    TCLocation.update({
      '_id': params.locationId,
      'authority.userId': params.assignee
    }, {
      $push: {

        authority:
          {
            userId: params.userEmail,
            author: params.loggedInAs
          },
      }
    }, function (err, n) {
      if (err) {
        return q.reject(err);
      }
      if (n.count) {
        return q.resolve(true);
      }
      q.reject(new Error ('update failed'));
    });

    return q.promise;
  },

  /**
   * checks for an existing entry for this authority,
   * an authority is a set of instructions / properties
   * as a sub-document on a loction document. This specifies
   * what users have access to certain location assets and
   * properties. All locations on tagchief have a parent-child
   * relationship. This methods helps set up this relationship,
   *
   * @param {[type]} params contains the  locationId,
   */
  addLocationAuthorityClass: function addLocationAuthorityClass (params) {
    var q = Q.defer();
    //
    // Should do find and update
    params = params || {};
    TCLocation.findOne(
      {
        _id: params.locationId,
        'entry_type': 'system'
      })
    .exec(function (err, d) {
      if (err) {
        return q.reject(err);
      }
      var $set = d.toObject();
      $set = _.extend({}, $set, {
        'parent': params.locationId,
        'entry_type': 'user',
        'authority' : [
              {
                userId: params.assignee,
                author: params.author
              }
            ]
      });
      delete $set._id;
      var t = new TCLocation($set);
      t.save(function (err) {
        if (err) {
          return q.reject(err);
        }
        return q.resolve(true);
      })

    });
    // TCLocation.update({
    //   parent: params.locationId,
    //   'authority.userId': params.assignee
    // }, {
    //   $set: {
    //     'parent': params.locationId,
    //     'entry_type': 'user',
    //     'authority' : [
    //           {
    //             userId: params.assignee,
    //             author: params.author
    //           }
    //         ]
    //   }
    // }, {upsert: true}, function (err, n) {
    //   if (err) {
    //     return q.reject(err);
    //   }
    //   if (n.count) {
    //     return q.resolve(true);
    //   }
    //   q.reject(new Error ('update failed'));
    // });
    return q.promise;
  },
  upsertAnswerRecord : function upsertAnswerRecord(params) {
      var q = Q.defer(),
      omittedParams = _.omit(params, ['_id', '__v']);

    FeedBackAnswers.update({
      checkInId: params.checkInId,
      locationId: params.locationId,
      clientPrimaryId     : params.clientPrimaryId,
      questions : params.questions
    },{
      $set: omittedParams
    }, {
      upsert: true
    },
    function (err, doc) {
      if (err) {
        return q.reject(err);
      }
      if (!doc.n) {
        return q.reject(errors.nounce('UpdateFailed'));
      }

      return q.resolve(doc);
    });

    return q.promise;
  },
  addCheckinAnswerRecord: function addCheckinAnswerRecord (params) {
      var q = Q.defer();
      params.clientPrimaryId = params._id;
      params = _.omit(params, ['_id', '_rev']);
      var f = new FeedBackAnswers(params);
      f.save(function (err) {
        if (err) {
          return q.reject(err);
        }
        q.resolve();
      });


      return q.promise;
  }

};

/**
 * This provides functions and utilities for device and location specific operations.
 *
 */
function LocationDeviceObject () {

 }


 LocationDeviceObject.prototype.constructor = LocationDeviceObject;


 LocationDeviceObject.prototype.cloneLocation = function cloneLocation (parents, authority) {
  var q = Q.defer(),
      count = 0,
      self = this;

  if (parents.length) {
    deviceFn.create_child_location({
      authority: {
        userId: authority.email,
        author: authority.userId,
        permissions: ['owner', 'write']
      },
      parentId: parents.pop()
    })
    .then(function () {
      count++;
      if (parents.length) {
        self.cloneLocation(parents, authority);
      } else {
        q.resolve({locationsAdded: count});
      }
    })
  }

  return q.promise;
 }


/**
 * creates a GCM registeration Id entry for a device or refreshes the registration id.
 * @param  {[type]} regId the device registeration Id sent from Google Cloud Messaging.
 * @param  {[type]} deviceId  the uuid of the device
 * @param  {[type]} userId   the objectid of the currently logged in user.
 * @return {[type]}          [description]
 */
 LocationDeviceObject.prototype.registerOrUpdateGCMDevice = function registerOrUpdateGCMDevice (regId, deviceId, userId) {
  var q = Q.defer();
  var params = {
    active: true,
    userId: userId,
    deviceId: deviceId
  };


  Device.findOne(params)
  .exec(function (err, d) {
    if (err) {
      return q.reject(err);
    }

    //if found, update / refresh registration id
    if (d) {
      d.registerationId = regId;
      d.save(function (err, i) {
        if (err) {
          return q.reject(err);
        }
        return q.resolve(i);
      });
    }
    //if not found create a new entry
    else {
      var device = new Device(params);
      device.registerationId = regId;
      device.save(function (err, i ) {
        if (err) {
          return q.reject(err);
        }
        return q.resolve(i);
      });

    }

    return q.resolve(d);
  });

  return q.promise;
 };

/**
 * checks if a device has been registered to TagChief
 * @param  {[type]} deviceId [description]
 * @param  {[type]} userId   [description]
 * @return {[type]}          [description]
 */
 LocationDeviceObject.prototype.checkDeviceIdExist = function checkDeviceIdExist (regId, userId) {
  var q = Q.defer();
  console.log('check if device dey');
  Device.findOne({
    registerationId: regId,
    active: true,
    userId: userId
  })
  .exec(function (err, d) {
    if (err) {
      return q.reject(err);
    }
    return q.resolve(d);
  });

  return q.promise;
 };


/**
 * gets the registerationId for all the devices belonging to a user
 * @param  {[type]} userId [description]
 * @return {[type]}        [description]
 */
 LocationDeviceObject.prototype.getUserDevices = function getUserDevices (userId) {
  console.log('get user devices info');
  var q = Q.defer();
  Device.find({
    active: true,
    userId: userId
  }, 'registerationId')
  .exec(function (err, d) {
    if (err) {
      return q.reject(err);
    }
    return q.resolve(d);
  });

  return q.promise;
 };

/**
 * gets the registerationId for the user's currently active device. i.e.
 * the device sending the request right now.
 * @param  {[type]} userId [description]
 * @return {[type]}        [description]
 */
 LocationDeviceObject.prototype.getCurrentUserDevice = function getCurrentUserDevice (userId, deviceId) {
  var q = Q.defer();
  Device.find({
    active: true,
    userId: userId,
    deviceId: deviceId
  }, 'registerationId')
  .exec(function (err, d) {
    if (err) {
      return q.reject(err);
    }
    return q.resolve(d);
  });

  return q.promise;
 };

 LocationDeviceObject.prototype.registerDevice = function registerDevice (deviceId, userId, registerId) {
  var q = Q.defer(),
      device = new Device();
  device.deviceId = deviceId;
  device.userId = userId;
  device.registerationId = registerId;
  device.save(function (err, doc) {
    if (err) {
      return q.reject(err);
    }

    return q.resolve(doc);
  });

  return q.promise;
 };

  /**
   * check for all notification / messages belonging to a user and
   * sends the message via GCM or APN or both to all the devices
   * registered by the user.
   * @param  {ObjectId} userId     mongo user ObjectId
   * @return {Promise]}            Promise
   */
  LocationDeviceObject.prototype.sendUserNotices = function sendUserNotices (userId, mssgs) {
    var q = Q.defer();
    //find all user msgs
    //find user device / regIds
    //send mssgs to GSM
    var exampleMsgs = {

    };
    Device.find({
      userId: userId,
      active: true
    },'registerationId')
    .exec(function (err, devList) {
      if (err) {
        return q.reject(err);
      }

      if (devList.length) {
        return q.resolve(_.pluck(devList, 'registerationId'));
        // var regIds = _.pluck(devList, 'registerationId');
        // var gcm = new GPushMessenger(regIds);

        // gcm.sendMessage(regIds, function (re) {
        // });
      } else {
        return q.reject(new Error('no devices found'));
      }
      //send to gcm
    });

    return q.promise;
  };


  LocationDeviceObject.prototype.addTagLocation = function addTagLocation (body, userId) {
      var q = Q.defer(),
          locationData = body.location || {};
      if (_.isString(body)) {
        if (JSON.parse(body)) {
          body = JSON.parse(body);
        } else {
          q.reject(new Error('InvalidParams'));
          return q.promise;
        }
      }
      if (!_.isObject(body)) {
        q.reject(new Error('InvalidParams'));
        return q.promise;
      }
      if (locationData.id) {
        TCLocation.find({
          _id: locationData.id
        })
        .exec(function (err, d) {
          if (err) {
            return q.reject(err);
          } else {
            d.count = d.count + 1;
            d.save(function (err, i) {
              if (err) {
                return q.reject(err);
              }
              return q.resolve(true);
              // deviceFn.saveUserLastTaggedLocation(userId, body.location.id)
              // .then(function () {
              // }, function (err) {
              //   return q.reject(err);
              // });
            });
          }
        });
      } else {
        deviceFn.addNewLocation(userId, body)
        .then(function (locData) {
            return q.resolve(true);
            // deviceFn.saveUserLastTaggedLocation(locData.author, locData._id)
            // .then(function () {
            // }, function (err) {
            //   return q.reject(err);
            // });
        }, function (err) {
          return q.reject(err);
        });
      }
      return q.promise;
  };

  LocationDeviceObject.prototype.shareLocation = function shareLocation (userId, recpId, locationId) {
      var q = Q.defer();


      return q.promise;
  };

  LocationDeviceObject.prototype.whatsAroundMe = function (userId, coords, query, useInterest) {
      var q = Q.defer();

      //lookup user interest,
      //lookup near by locations
      //filter locations by user interest
      //send payload
      //list tagged locations in proximity...
      deviceFn.inProximity(coords, query)
      .then(function (locationLists) {
        if (_.isEmpty(locationLists)) {
          return q.resolve([]);
        } else {
          //should filter or sort by users interest first.
          return q.resolve(locationLists);
        }
      }, function (err) {
        return q.reject(err);
      });

      return q.promise;
  };

  LocationDeviceObject.prototype.getOneLocation = function getOneLocation (locationId) {
      var q = Q.defer();

      deviceFn.findALocationById(locationId)
      .then(function (l) {
        return q.resolve(l);
      }, function (err) {
        return q.reject(err);
      });

      return q.promise;
  };

  LocationDeviceObject.prototype.listLocationsByParams = function listLocationsByParams (user, coords, params) {
    console.log('listing device by params');
      var q = Q.defer(), task = {}, self = this;

      switch (params.listType) {
        case 'checkin':
          task.task = deviceFn.findUserCheckedInLocations;
          task.args = [];
          break;
        case 'authored':
          task.task = deviceFn.findLocationsByMe;
          task.args = [];
          break;
        case 'count_places_near_by':
          task.task = deviceFn.inProximity;
          task.args = [coords, params];
          break;
        case 'list_all_locations':
          task.task = deviceFn.fetchLocationsByParams;
          if (params.entry_type === 'user') {
            params.assignee = user.email;
          }
          task.args = [params];
          break;
        case 'count_locations':
          task.task = deviceFn.countLocationsByParams;
          break;
        case 'search': 
          task.task = self.searchGPlaces;
          task.args = [params.search, coords]
          break;
        default:
        task.task = deviceFn.inProximity;
        task.args = [coords, params];
        break;
      }


      // deviceFn.inProximity(coords, params)
      task.task.apply(this, task.args)
      .then(function (d) {
        q.resolve(d);
      }, function (err) {
        q.reject(err);
      });

      return q.promise;
  };

  LocationDeviceObject.prototype.searchGPlaces = function searchGPlaces (keyword, geoCoords, maxDistance = 1, limit = 10, page = 0) {
    let q = Q.defer();

      var googlePlaces = new GooglePlaces('AIzaSyCOt9IYHpYN22m7alw_HKi5y5WBgu57p4s', 'json');
      googlePlaces.placeSearch({
        location: [geoCoords[1], geoCoords[0]], // $nearSphere
        keyword: keyword
      }, function (error, response) {
          // if (error) throw error;
          // if no errors are found and the response 
          // contains a results . Use the recursive 
          // function recur_add to add the found results
          // from google to our database. 
          if (!error && response && response.status === 'OK' && response.results.length) {

            deviceFn.recur_add(response.results, function () {

              TCLocation.find({
                name: new RegExp(keyword, 'i'),
                entry_type: 'system',
                coords: {
                  "$nearSphere": geoCoords,
                  "$maxDistance": maxDistance
                }
              })
              .limit(limit)
              .skip(limit * page)
              .exec(function (err, locations) {
                if (err) {
                  return q.reject(err);
                }

                if (locations.length) {

                  return q.resolve(locations);
                }
                return q.resolve([]);
              });
            });
          } else {
              TCLocation.find({
                name: new RegExp(keyword, 'i'),
                entry_type: 'system',
                coords: {
                  "$nearSphere": geoCoords,
                  "$maxDistance": maxDistance
                }
              })
              .limit(limit)
              .skip(limit * page)
              .exec(function (err, locations) {
                if (err) {
                  return q.reject(err);
                }

                if (locations.length) {

                  return q.resolve(locations);
                }
                return q.resolve([]);
              });
          }
          // console.log(response);
      });

    return q.promise;
  }

  /**
   * adds a new question to the database
   * @param  {[type]} userId [description]
   * @param  {[type]} body   [description]
   * @return {[type]}        [description]
   */
  LocationDeviceObject.prototype.insertQuestion  = function insertQuestion (userId, body) {
    var q = Q.defer();

    var qq = new Questions(body);
    qq.author =  userId;
    qq.assignee =  body.email_assignee;
    qq.title =  body.questions[0];
    qq.preferred =  body.response_type;
    qq.currentGroup = body.currentGroup || 'a';
    qq.promptAfter = body.promptAfter;

    qq.save(function (err) {
      if (err) {
        return q.reject(err);
      }
      q.resolve(qq._id);
    });

    return q.promise;
  };

  LocationDeviceObject.prototype.removeUserQuestion = function removeUserQuestion (id, assignee, isAdmin, author) {
    var q = Q.defer();

    if (!assignee && !isAdmin) {
      q.reject(new Error('UnauthorizedOperation'));
      return q.promise;
    }
    deviceFn.deleteQuestion({
      id: id,
      author: author,
      assignee: assignee
    })
    .then(function (d) {
      q.resolve(d);
    }, function (err) {
      q.reject(err);
    });

    return q.promise;
  };

  LocationDeviceObject.prototype.listQuestionsByParams = function listQuestionsByParams (userId, group) {
    var q = Q.defer();
    var params = {
      currentGroup: group || 'a',
      assignee: userId
    };

    deviceFn.listQuestionsByParams(params)
    .then(function (m) {
      q.resolve(m);
    }, function (err) {
      return q.reject(err);
    });

    return q.promise;
  };




  /**
   * Checks a user into a location
   * @param  {[type]} deviceId   [description]
   * @param  {[type]} locationId [description]
   * @param  {[type]} userId     [description]
   * @return {[type]}            [description]
   */
  LocationDeviceObject.prototype.checkIntoLocation = function checkIntoLocation (deviceId, locationId, user) {
      var q = Q.defer();
      deviceFn.addACheckInRecord({
        deviceId: deviceId,
        locationId: locationId,
        userId: user
      })
      .then(function (checkInId) {
        var pro = CheckLog.populate(checkInId, {
          path: 'locationId',
          select: 'name category dateAdded authority',
          model: 'Location'
        });
        pro.then(function (doc) {
          var assignee = doc.locationId.authority[0] ?  
              doc.locationId.authority[0].userId : 
               doc.locationId.category || 'superuser' + '@tagchief.com';
          Questions.find({
            assignee: assignee
          })
          .exec(function (err, qt) {
            // i guess this pulldown the questions qtbelonging tothis 
            // /the owner of this location.
            if (err) {
              return q.reject(err);
            }
            var docO = doc.toObject();
            docO.questions = qt;
            return q.resolve(docO);
          });

        });
        //actions like reward a user / location should follow
      }, function (err) {
        console.log('an error occured');
        return q.reject(err);
      })
      .catch(function (err) {
        console.log('an error got caught');
        console.log(err);
        return q.reject(err);
      });

      return q.promise;
  };

  /**
   * checks a user out of a location previously checked into.
   * @param  {[type]} checkInId  [description]
   * @param  {[type]} locationId [description]
   * @param  {[type]} userId     [description]
   * @return {[type]}            [description]
   */
  LocationDeviceObject.prototype.checkOutLocation = function checkOutLocation (checkInId, locationId, userId) {
      var q = Q.defer();

      deviceFn.findACheckInEntry(checkInId, userId)
      // .then(deviceFn.isValidCheckIn)
      .then(deviceFn.updateACheckInEntry)
      .then(function (response) {
        return q.resolve(response);
      }, function (err) {
        return q.reject(err);
      })
      .catch(function (err) {
        return q.reject(err);
      });
      return q.promise;
  };

  LocationDeviceObject.prototype.insertCheckInRecord = function insertCheckInRecord (body) {
    var q = Q.defer();
    FeedBackAnswers.update({
      checkInId: body.checkInId,
      locationId: body.locationId
    }, {
      $set: {
        locationId: body.locationId,
        questionId: body.questionId,
      },
      $push: body.answer
    }, {upsert: true}, function (err, doc) {
          if (err) {
            return q.reject(err);
          }
          if (!doc) {
            return q.reject(errors.nounce('UpdateFailed'));
          }

          return q.resolve(doc);
    });

    // q.resolve(body);
    return q.promise;
  };

  LocationDeviceObject.prototype.saveFeedback = function (body) {
      var q = Q.defer();

      deviceFn.upsertAnswerRecord(body)
      .then(function() {
        return q.resolve();
      }, function (err) {
        return q.reject(err);
      });

      return q.promise;
  };

  /**
   * not minding the method name, this attempts
   * to query and produce all checkins ordered
   * by the most recent for a specific location.
   * @param  {[type]} locationId the _id of the
   * location in subject.
   * @param  {[type]} query      query stuff like
   * filters etc.
   * @return {[type]}            [description]
   */
  LocationDeviceObject.prototype.getLocationActivity = function getLocationActivity (locationId, query) {
    var q = Q.defer();

    deviceFn.fetchLocationCheckInRecords({
      locationId : locationId,
      query: query
    })
    .then(function (docs) {
      return q.resolve(docs);
    }, function (err) {
      return q.reject(err);
    });

    return q.promise;
  };

  /**
   * fetches all feedback given
   * for a specific location
   */
  LocationDeviceObject.prototype.getLocationOverview = function (locationId, query_params) {
    var q = Q.defer();

    deviceFn.allLocationFeedback({
      locationId : locationId,
      query: query_params,
      public: true
    })
    .then(function (docs) {
      return q.resolve(docs);
    }, function (err) {
      return q.reject(err);
    });

    return q.promise;
  }

  /**
   * this should add or remove certain properties /
   * usually in the authority sub-documents in a
   * location document
   * @param  {[type]} locationId   [description]
   * @param  {[type]} updateParams [description]
   * @return {[type]}              [description]
   */
  LocationDeviceObject.prototype.updateLocationAuthorityClass = function updateLocationAuthorityClass (reviewedDocument, author) {
    var q = Q.defer();
    var result = {
      doneArray : [],
      errorArray : []
    };



    var locationList = reviewedDocument.locationList;


    function recursive_callback(locationList) {

      var _instruct = locationList.shift(),
      _cb;

      switch(_instruct.action) {
        case 'add-authority':
        _cb  = deviceFn.addLocationAuthorityClass;
        break;
        case 'modify-authority':
        _cb  = deviceFn.modifyLocationAuthorityClass;
        break;
        default:
        break;
      }

      _cb({
        locationId: _instruct.locationId,
        assignee: reviewedDocument.assignee,
        authority: _instruct.authority,
        author: author
      })
      .then(function(done) {
        result.doneArray.push(done);
        if (locationList.length) {
          recursive_callback(locationList);
        } else {
          q.resolve(result);
        }
      }, function (err) {
        result.errorArray.push(err);
        if (locationList.length) {
          recursive_callback(locationList);
        } else {
          q.resolve(result);
        }
      });
    };

    recursive_callback(locationList);

    return q.promise;
  };

  /**
   * Adds, updates, removes a location from a question-feedback group
   * @return {[type]} [description]
   */
  LocationDeviceObject.prototype.updateSubjectGroup = function updateSubjectGroup (reviewedDocument) {
    var q = Q.defer();
    var result = {
      doneArray : [],
      errorArray : []
    };



    function recursive_callback(locationList) {

      var _instruct = locationList.shift(),
      _cb;

      switch(_instruct.action) {
        case 'add-group':
        _cb  = deviceFn.addLocationtoGroupClass;
        break;
        case 'modify-group':
        _cb  = deviceFn.modifyLocationGroupClass;
        break;
        default:
        break;
      }

      _cb({
        locationId: _instruct.locationId,
        author: _instruct.author,
        assignee: reviewedDocument.assignee || 'admin@tagchief.com',
        subjectGroup: reviewedDocument.subjectGroup
      })
      .then(function(done) {
        result.doneArray.push(done);
        if (locationList.length) {
          recursive_callback(locationList);
        } else {
          q.resolve(result);
        }
      }, function (err) {
        result.errorArray.push(err);
        if (locationList.length) {
          recursive_callback(locationList)
        } else {
          q.resolve(result);
        }
      });
    }

    recursive_callback(reviewedDocument.locationList);
    //deviceFn.fetchLocationsByParams(reviewedDocument.criteria)
    // .then(function(loctns) {
    // },
    // function (err) {
    //   q.reject(err);
    // });

    return q.promise;

  },

  LocationDeviceObject.prototype.searchLocations = function searchLocations (query) {
    var q = Q.defer();

    deviceFn.query(query.name)
    .then(function (docs) {
      return q.resolve(docs);
    }, function (err) {
      return q.reject(err);
    });

    return q.promise;
  };

  LocationDeviceObject.prototype.getActivityCheckIn = function getActivityCheckIn (locationId, cid, queryString) {
    var q = Q.defer();

    deviceFn.findCheckInFeedback({
      checkInId: cid,
      locationId: locationId
    })
    .then(function (docs) {
      q.resolve(docs);
    }, function (err) {
      q.reject(err);
    });

    return q.promise;
  };

  /**
   * gets all the feedback that the currently
   * logged in user is authorized to see.
   * this should be combined with a locationId.
   *
   * @return {[type]} [description]
   */
  LocationDeviceObject.prototype.getFeedback = function getFeedback (email) {
    var q = Q.defer();

    deviceFn.findLocationsByMe(email)
    .then(function (locations) {
      console.log(locations);
      deviceFn.queryFeedback({
        locationId: {$in: locations}
      })
      .then(function (docs) {
        q.resolve(docs);
      }, function (err) {
        q.reject(err);
      });
    });


    return q.promise;
  };

 module.exports = LocationDeviceObject;