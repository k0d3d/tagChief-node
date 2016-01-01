
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    _ = require('lodash');

var LocationMedia = new Schema ({
  fileName: {type: String},
  locationId: {type: Schema.ObjectId},
  addedOn: {type: Date, default: Date.now},
  featured: {type: Boolean},
  type: {type: String},
  isVisible: {type: Boolean, default:true },
  uploader: {type: Schema.ObjectId},
  mediaType: {type: String}
});

var LocationSchema = new Schema({
    name:String,
    description:String,
    category: {type: String},
    specials: [{type: String}],
    props : [{
      name: String,
      value: String
    }],
    parent: {type: Schema.ObjectId},
    entry_type: {type: String, default: 'system'},
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
    media: [LocationMedia],
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

var QuestionSchema = new Schema ({
  author: {type: Schema.ObjectId},
  assignee: {type: String},
  title: {type: String},
  preferred: {type: String},
  addedOn: {type: Date, default: Date.now},
  locations: [{type: Schema.ObjectId}]
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
  questionId: {type: Schema.ObjectId},
  answers: [{
      timeUpdated :{type: Date},
      decision : {type: String},
      dateTriggered : {type: Date},
      hasComment:  {type: String},
      hasImage:  {type: String},
      hasVideo:  {type: String}
    }]
});


module.exports = {
  'PointsHistory': mongoose.model('PointsHistory', PointsSchema),
  'Review': mongoose.model('Reviews', ActionSchema),
  'TCLocation': mongoose.model('Location', LocationSchema),
  'CheckLog': mongoose.model('Checklog', CheckInSchema),
  'Questions': mongoose.model('Questions', QuestionSchema),
  'FeedBackAnswer': mongoose.model('FeedBackAnswer', FeedBackAnswers)
};