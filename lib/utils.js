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