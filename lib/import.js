var mongoose = require('mongoose');
var Schema = mongoose.Schema;

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
    verififiedCounts: {type: Number, default: 0 },
    upVotes: {type: Number},
    downVotes: {type: Number},
    address: {type: String},
    ward: {type: String},
    lga: {type: String},
    state: {type: String},
    machine_brand: {type: String},
    offsite_branch: {type: String},
});

//stopped at 14054

var fs = require('fs');
var readline = require('readline');
var Stream = require('stream');
var Q = require('q');

mongoose.model('Location', LocationSchema);
var TCLocation = mongoose.model('Location');

function addNewLocation (user, body) {
      var q = Q.defer();
      var l = new TCLocation(body);
      l.coords =  [parseFloat(body.lon), parseFloat(body.lat)];
      l.longitude = body.lon;
      l.latitude = body.lat;
      l.author = user;
      l.save(function (err, saveDoc) {
        if (err) {
          return q.reject(err);
        }

        if (saveDoc) {
          return q.resolve(saveDoc);
        }
      });
      return q.promise;
}

function exec () {

  var instream = fs.createReadStream('./assets/lagos.csv');
  var outstream = new Stream();

  var rl = readline.createInterface(instream, outstream), i = 0;

  rl.on('line', function(line) {
    var a = line.split(',');
    var proLine = {
      name: a[0],
      category: a[1],
      state: a[2],
      lga: a[3],
      coords: [a[6], a[7]],
      lat: a[6],
      lon:a [7],
      description: a[8]

    };
    // process line here
    addNewLocation("54d711caaf3f66293ba5da71", proLine)
    .then(function (saveDoc) {
      console.log(saveDoc);
      console.log(i++);
    }, function (err) {
      console.log(err);
    });
  });

  rl.on('close', function() {
    // do something on finish here
    console.log('finished');
  });
}


var db = mongoose.connection;

var dbURI = 'mongodb://heroku_app33864268:oufojfnkdt6dj8hjmqlsqe6e2u@ds041651.mongolab.com:41651/heroku_app33864268';
// var dbURI = 'mongodb://127.0.0.1:27017/tagChief';


// Create the database connection
mongoose.connect(dbURI);

// CONNECTION EVENTS
// When successfully connected
db.on('connected', function() {
    console.log('Mongoose default connection open');
    exec();

});

// If the connection throws an error
db.on('error', function(err) {
    console.log('Mongoose default connection error: ' + err);
});
// When the connection is disconnected
db.on('disconnected', function() {
    console.log('Mongoose default connection disconnected');
});
// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
    db.close(function() {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});