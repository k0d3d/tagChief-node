     /**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var MessageSchema = new Schema({
  deviceId: {type:String, required: true},
  registeredDate: {type: Date, default: Date.now},
  useCount: {type: Number, default: 0},
  registerationId: {type:String, required: true, unique: true},
  userId: {type: String},
  message: {type: String},
  aData: [],
  active: {type: Boolean, default: true},
  lastPing: {type: Date}

}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

mongoose.model('Message', MessageSchema);
module.exports = mongoose.model('Message');