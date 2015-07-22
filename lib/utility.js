
  var _ = require('lodash');

  function Utility(){

  }

  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }

  Utility.prototype.uuid = function(){
      return s4() + s4() + '-' + s4() + s4()+'-'+s4();
  };

  /**
   * Retrun a random int, used by `utils.uid()`
   *
   * @param {Number} min
   * @param {Number} max
   * @return {Number}
   * @api private
   */
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Return a unique identifier with the given `len`.
   *
   *     utils.uid(10);
   *     // => "FDaS435D2z"
   *
   * @param {Number} len
   * @return {String}
   * @api private
   */
  Utility.prototype.uid = function(len) {
    var buf = [],
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        charlen = chars.length;

    for (var i = 0; i < len; ++i) {
      buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
  };

  Utility.prototype.mediaNumber = function(){
    var milliseconds = (new Date()).getTime().toString();

    return parseInt(milliseconds.substring(2), 10);
  };

  Utility.prototype.cleanIdentifier = function(identifier){

    return identifier.replace(/[\|&;\#~^$%@"<>\(\)\+,]/g, "");
  };

  Utility.prototype.consolelog = function (debug)  {
    var args = _.values(arguments).slice(1);
    if (debug) {

      console.log.apply(undefined, args);
    }
  };
  Utility.prototype.isEmail = function isEmail(email) {
      var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
      return re.test(email);
  };


module.exports = Utility;