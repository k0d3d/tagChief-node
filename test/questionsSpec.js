var db = require('../lib/db').open();

describe('Questions', function() {
  var DeviceModule = require('../models/device');

  it('should fetch questions in an array', function (done) {
    var dm = new DeviceModule();
    db.then(function() {

      dm.listQuestionsByParams({

      })
      .then(function (i) {
        expect(i.length).toBeDefined();
        expect(JSON.stringify(i)).toBeTruthy();
        done();
      })
    });
  }, 1000)
});
