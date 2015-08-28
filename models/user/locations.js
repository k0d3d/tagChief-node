
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    encrypt = require('../../lib/commons.js').encrypt,
    _ = require('lodash'),
    uniqueValidator = require('mongoose-unique-validator');

var LocationImages = new Schema ({
  fileName: {type: String},
  locationId: {type: Schema.ObjectId},
  addedOn: {type: Date, default: Date.now},
  featured: {type: Boolean},
  type: {type: String},
  isVisible: {type: Boolean, default:true },
  uploader: {type: Schema.ObjectId}
});

var LocationSchema = new Schema({
    name:String,
    description:String,
    category: {type: String},
    specials: [{type: String}],
    tags: [{type: String}],
    dateAdded: {type: Date, default: Date.now},
    longitude: Number,
    latitude: Number,
    coords: {type: [Number, Number], index: '2d'},
    author: {type: Schema.ObjectId},
    authority: [
      {
        userId: {type: String},
        addedOn: {type: Date, default: Date.now()},
        updatedAt: {type: Date},
        author: {type: Schema.ObjectId},
        permissions: [{
          type: String,
          default: 'read'
        }]
      }
    ],
    verififiedCounts: {type: Number, default: 0 },
    upVotes: {type: Number},
    downVotes: {type: Number},
    address: {type: String},
    ward: {type: String},
    lga: {type: String},
    state: {type: String},
    machine_brand: {type: String},
    offsite_branch: {type: String},
    photos: [LocationImages],
    google_place_id: {type: String},
    googleId: {type: String}
});

var CheckInSchema = new Schema ({
  locationId: {type: Schema.ObjectId},
  checkInTime: {type: Date, default: Date.now},
  checkOutTime: {type: Date},
  userId: {type: Schema.ObjectId},
  deviceId: {type: String},
  category: {type: String},
  questions: []
});

var ActionSchema = new Schema ({
  locationId: {type: Schema.ObjectId},
  checkId: {type: String},
  rating: {type: Number},
  comments: {type: String}
});

var PointsSchema = new Schema ({
  actionPerformed: {type: String},
  pointsAwarded: {type: Number},
  dateAdded: {type: Date, default: Date.now},
  relationalData: [],
});


var FeedBackAnswers = new Schema ({
  checkInId: {type: Schema.ObjectId},
  locationId: {type: Schema.ObjectId},
  nextQuestion: {type: Number},
  questions: [Schema.Types.Mixed]
});

var Question = new Schema ({
  qid: {type: String},
  creator: {type: Schema.ObjectId},
  locationId: {type: Schema.ObjectId}
});

module.exports = {
  "PointsHistory": mongoose.model('PointsHistory', PointsSchema),
  "Review": mongoose.model('Reviews', ActionSchema),
  "TCLocation": mongoose.model('Location', LocationSchema),
  "CheckLog": mongoose.model('Checklog', CheckInSchema),
  "FeedBackAnswer": mongoose.model('FeedBackAnswer', FeedBackAnswers)
};