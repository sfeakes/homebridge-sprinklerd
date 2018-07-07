var inherits = require('util').inherits;

module.exports = {
    Utils: Utils
}

function Utils() {}

Utils.LogConnectionError = function(platform, response, err)
{
  var errorMessage = "There was a problem connecting to SprinklerD.";

  if (response && response.statusCode) {
    errorMessage += " (HTTP Status code " + response.statusCode + ")\n" + response.body;
  }
  
  if (err) {
    errorMessage += "\n- " + err;
  }

  platform.forceLog(errorMessage);
}

var TRUTHY_VALUES = 'y yes true'.split(/\s/);
Utils.toBool =  function(value) {
    value = value.toString();
    value = value.trim();
    value = value.toLowerCase();

    // Empty string is considered a falsy value
    if(!value.length) {
      return false;

    // Any number above zero is considered a truthy value
    } else if(!isNaN(Number(value))) {
      return value > 0;

    // Any value not marked as a truthy value is automatically falsy
    } else {
      return TRUTHY_VALUES.indexOf(value) >= 0;
    }
}
