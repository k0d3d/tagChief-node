var gcm = require('node-gcm'),
    Q = require('q');
    // Device = require('../models/device');


function GPushMessenger (registerationIds) {
  this.messageQueue = {};
  this.currentDeviceRegIds = registerationIds;
  this.currentGCMObject = new gcm.Message();

}

GPushMessenger.prototype.constructor = GPushMessenger;

GPushMessenger.prototype.queueMessage = function queueMessage (title, message, type) {
  this.messageQueue = {
    title: title,
    message: message,
    type: type
  };

};



GPushMessenger.prototype.sendMessage = function sendMessage (cb) {
  var self = this,
  message = self.currentGCMObject;

  //API Server Key
  var sender = new gcm.Sender('AIzaSyCOt9IYHpYN22m7alw_HKi5y5WBgu57p4s');
  // var registrationIds = registerationIds;

  // Value the payload data to send...
  message.addData('message', self.messageQueue.message);
  message.addData('title', self.messageQueue.title);
  message.addData('msgcnt','1'); // Shows up in the notification in the status bar
  message.addData('execAction', self.messageQueue.type);
  // message.addData('soundname','beep.wav'); //Sound to play upon notification receipt - put in the www folder in app
  message.collapseKey = self.messageQueue.type;
  message.delayWhileIdle = true; //Default is false
  message.timeToLive = 3000;// Duration in seconds to hold in GCM and retry before timing out. Default 4 weeks (2,419,200 seconds) if not specified.

  // At least one reg id required
  // registrationIds.push('APA91bwu-47V0L7xB55zoVd47zOJahUgBFFuxDiUBjLAUdpuWwEcLd3FvbcNTPKTSnDZwjN384qTyfWW2KAJJW7ArZ-QVPExnxWK91Pc-uTzFdFaJ3URK470WmTl5R1zL0Vloru1B-AfHO6QFFg47O4Cnv6yBOWEFcvZlHDBY8YaDc4UeKUe7ao');

  /**
   * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
   */
  sender.send(message, self.currentDeviceRegIds, 4, function (err, result) {
      console.log(err, result);
      cb(result);
  });
};


module.exports = GPushMessenger;