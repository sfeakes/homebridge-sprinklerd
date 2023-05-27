
// We do not need node-fetch, if you remove this it will default to NodeJS internal fetch.
// BUT node-fetch Gives way more meaningful errors than moment, so leaving it in.
var fetch = require("node-fetch"); 

// We need to set ipv4 first, latest node is ipv6 first. 
// can to this be resetting dns or custom http.agent
//const dns = require('node:dns');
// Use http ageng over above.
const http = require('node:http');



//var request = require("request");
var Constants = require('./constants.js');
var Utils = require('./utils.js').Utils;
// var extend = require('util')._extend;

module.exports = {
  Sprinkler : Sprinkler
}

var httpAgent = false;

function Sprinkler() {}

Sprinkler.initialize = function(useSSL, requestHeaders) {
  // We can force ipv4 first with below.
  //dns.setDefaultResultOrder('ipv4first');
  // Or we can use a custo, http.user agent.
  httpAgent = new http.Agent({
    family: 4
  });
};

Sprinkler.devices = async function(baseURL, completion, error) {

  if (httpAgent === false) {
    return;
  }
  
  var url = baseURL + "type=homebridge";
  var res;

  try {
    res = await fetch(url, {agent: httpAgent} );
  } catch (err) {
    if (typeof error !== 'undefined' && error !== false) {
      error("Error connecting to SprinklerD service", err);
    } else {
      console.log("Error connecting to SprinklerD service : "+ err);
    }
    return;
  }

  if (!res.ok) {
    if (typeof error !== 'undefined' && error !== false) {
      error("Error returned from SprinklerD service", res);
    } else {
      console.log(`Error returned from SprinklerD service: ${res.statusText}`);
    }
    return;
  } else {
    try {
      const json = await res.json();
      var devices = [];

      if (json.devices === undefined) {
        if (typeof completion !== 'undefined' && completion !== false) {
          completion(devices);
        }
        return;
      }

      for (var i = 0; i < json.devices.length; i++) {
        var device = json.devices[i];
        // Reset name on master valve.
        if (device.id == Constants.idMasterValve)
          device.name = json.title;

        devices.push(device);
      }

      if (typeof completion !== 'undefined' && completion !== false) {
        completion(devices);
      }
    } catch (err) {
      if (typeof error !== 'undefined' && error !== false) {
        error("Error understanding result from SprinklerD service", err);
      } else {
        console.log("Error understanding result from SprinklerD service : "+ err);
      }
      return;
    }
  } 
};
/*
Sprinkler.devices = function(baseURL, completion, error) {
  if (baseHttpRequest === false) {
    return;
  }

  var url = baseURL + "type=homebridge";

  baseHttpRequest.get({url : url}, function(err, response, json) {
    if (!err && response.statusCode == 200) {
      var devices = [];

      if (json.devices === undefined) {
        if (typeof completion !== 'undefined' && completion !== false) {
          completion(devices);
        }
        return;
      }

      for (var i = 0; i < json.devices.length; i++) {
        var device = json.devices[i];
        // Reset name on master valve.
        if (device.id == Constants.idMasterValve)
          device.name = json.title;

        devices.push(device);
      }

      if (typeof completion !== 'undefined' && completion !== false) {
        completion(devices);
      }
    } else {
      if (typeof error !== 'undefined' && error !== false) {
        error(response, err);
      }
    }
  });
};
*/

/*
// This is not used, just here incase we go back to mising HTTP with MQTT
Sprinkler.deviceStatus = function(accessory, completion, statustype, error) {
  if (baseHttpRequest === false) {
    return;
  }

  var url = accessory.platform.apiBaseURL + "type=homebridge";

  baseHttpRequest.get({url : url}, function(err, response, json) {

    if (!err && response.statusCode == 200 && json !== undefined) {
      if (json.devices === undefined) {
        // Handle error
        return;
      }
      for (var i = 0; i < json.devices.length; i++) {
        var device = json.devices[i];
        if (device.id == accessory.id) {
          if (statustype === Constants.statusDuration)
            completion(device.duration);
          else 
            completion(device.state == "on" ? 1 : 0);
        }
      }
    } else {
      Utils.LogConnectionError(this.platform, response, err);
      if (typeof error !== 'undefined' && error !== false) {
        error();
      }
    }
  }.bind(accessory));
};
*/
Sprinkler.updateDeviceStatus = function(accessory, value, completion, statustype = Constants.statusStatus) {
  if (accessory.platform.mqtt) {
    if (statustype === Constants.statusDuration)
      accessory.platform.mqtt.send(accessory.id + "/duration/set", value.toString());
    else
      accessory.platform.mqtt.send(accessory.id + "/set", value ? "1" : "0");
    if (typeof completion !== 'undefined' && completion !== false) {
      completion(true);
    }
    return;
  }
/*
  var url = accessory.platform.apiBaseURL + "type=option&option=" + this.id + "&state=" + value ? "on" : "off";
  if (accessory.type == Constants.sdDeviceZone && this.id != Constants.idCycleAllZones)
    url = accessory.platform.apiBaseURL + "type=zone&zone=" + this.zonenumber + "&state=" + value ? "on" : "off";

  for (var key in parameters) {
    url += "&" + encodeURI(key) + "=" + encodeURI(parameters[key]);
  }

  Sprinkler.updateWithURL(accessory, url, completion);
*/
};

/*
Sprinkler.updateWithURL = function(accessory, url, completion) {
  if (baseHttpRequest === false) {
    return;
  }

  baseHttpRequest.put({url : url, header : this.requestHeaders, json : true}, function(err, response) {
    var success = (typeof err === 'undefined' || !err);

    if (success) {
      this.platform.log(this.name + " sent command succesfully.");
    } else {
      Utils.LogConnectionError(this.platform, response, err);
    }

    if (typeof completion !== 'undefined' && completion !== false) {
      completion(success);
    }
  }.bind(accessory));
};
*/
