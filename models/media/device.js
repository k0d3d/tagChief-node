     /**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var DeviceSchema = new Schema({
  deviceId: {type:String, required: true},
  registeredDate: {type: Date, default: Date.now},
  useCount: {type: Number, default: 0},
  registerationId: {type:String, required: true, unique: true},
  userId: {type: String},
  active: {type: Boolean, default: true},
  lastPing: {type: Date}

}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

mongoose.model('Device', DeviceSchema);
module.exports = mongoose.model('Device');