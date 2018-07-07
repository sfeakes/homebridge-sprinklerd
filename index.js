
// Example ~/.homebridge/config.json content:
//
// {
//  "bridge": {
//         "name": "Homebridge",
//         "username": "CC:21:3E:E4:DE:33", // << Randomize this...
//         "port": 51826,
//         "pin": "031-45-154", // << Change pin
//      },
//
//  "platforms": [{
//         "platform": "sprinklerd",
//         "name": "sprinklerd",
//         "server": "127.0.0.1", // servername/ip running SprinklerD
//         "port": "80",
//         "mqtt": {
 //              "host": "mqtt-server.name",  // servername/ip running MQTT
//               "port": 1883,
//               "topic": "sprinklerd"
//         }
//    }],
//  "accessories":[]
// }
//



var Sprinkler = require('./lib/sprinkler.js').Sprinkler;
var Mqtt = require('./lib/mqtt.js').Mqtt;
var Utils = require('./lib/utils.js').Utils;
var SprinklerdAccessory = require('./lib/sprinklerd_accessory.js');
var Constants = require('./lib/constants.js');

const util = require('util');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  Types = homebridge.hapLegacyTypes;
  UUID = homebridge.hap.uuid;

  homebridge.registerPlatform("homebridge-sprinklerd", "sprinklerd", SprinklerdPlatform, true);
};

function SprinklerdPlatform(log, config, api) {
  this.isSynchronizingAccessories = false;
  this.accessories = [];
  this.forceLog = log;
  this.log = function() {
    if (typeof process.env.DEBUG !== 'undefined') {
      log(util.format.apply(this, arguments));
    }
  };

  this.config = config;
  try {
    this.server = config.server;
  } catch (e) {
    return;
  }
  this.authorizationToken = false;
  if (this.server.indexOf(":") > -1 && this.server.indexOf("@") > -1) {
    var tmparr = this.server.split("@");
    this.authorizationToken = Helper.Base64.encode(tmparr[0]);
    this.server = tmparr[1];
  }
  this.port = config.port;
  this.api = api;
  this.apiBaseURL = "http://" + this.server + ":" + this.port + "/?";
  this.mqtt = false;
  this.ssl = false;

  var requestHeaders = {};
  if (this.authorizationToken) {
    requestHeaders['Authorization'] = 'Basic ' + this.authorizationToken;
  }
  Sprinkler.initialize(this.ssl, requestHeaders);

  if (this.api) {
    this.api.once("didFinishLaunching", function() {
      var syncDevices = function() {
        this.synchronizeAccessories();
        setTimeout(syncDevices.bind(this), 600000); // Sync devices every 10 minutes
        //setTimeout(syncDevices.bind(this), 6000); // Sync devices every 1 minutes
      }.bind(this);
      syncDevices();

      if (config.mqtt) {
        setupMqttConnection(this);
      }
    }.bind(this));
  }
}

SprinklerdPlatform.prototype = {
  synchronizeAccessories : function() {

    if (this.isSynchronizingAccessories) {
      return;
    }

    this.isSynchronizingAccessories = true;
    // var excludedDevices = (typeof this.config.excludedDevices !== 'undefined') ? this.config.excludedDevices : [];

    Sprinkler.devices(this.apiBaseURL,
                      function(devices) {
                        var removedAccessories = [], exclude = !1;

                        for (var i = 0; i < devices.length; i++) {
                          var device = devices[i];
                         
                          var existingAccessory = this.accessories.find(function(existingAccessory) { return existingAccessory.id == device.id; });
                          
                          if (existingAccessory) {
                            if (device.type != existingAccessory.type) {
                              this.log("Device " + existingAccessory.name + " has changed it's type. Recreating...");
                              removedAccessories.push(existingAccessory);
                              try {
                                this.api.unregisterPlatformAccessories("homebridge-sprinklerd", "sprinklerd", [ existingAccessory.platformAccessory ]);
                              } catch (e) {
                                this.forceLog("Could not unregister platform accessory! (" + removedAccessory.name + ")" + e);
                              }
                            } else {
                              // Since we have everything, may as well update if needed.
                              if ( (device.state=="on"?true:false) != existingAccessory.state ) {
                                this.log("Background update to '"+existingAccessory.id+"' state old="+existingAccessory.state+" new="+(device.state=="on"?true:false))
                                existingAccessory.state = (device.state==1?true:false);
                              }
                              if (device.duration != existingAccessory.duration) {
                                this.log("Background update to '"+existingAccessory.id+"' duration old="+existingAccessory.duration+" new="+device.duration);
                                existingAccessory.duration = device.duration;
                              }
                              if (existingAccessory.id == Constants.idCycleAllZones && existingAccessory.zonenumber != device.zone) {
                                this.log("Background update to '"+existingAccessory.id+"' zone# old="+existingAccessory.zonenumber+" new="+device.zone);
                                existingAccessory.zonenumber = device.zone;
                              }
                              
                              continue;
                            }
                          }
                          // Generate a new accessory
                          var uuid = UUID.generate(device.name);

                          var accessory = new SprinklerdAccessory(this, false, device.id, device.state, device.type, device.zone, device.name, device.duration, uuid);
                          this.accessories.push(accessory);
                          this.forceLog("Registering new platform accessory! (" + accessory.name + " | " + uuid + ")");

                          try {
                            this.api.registerPlatformAccessories("homebridge-sprinklerd", "sprinklerd", [ accessory.platformAccessory ]);
                          } catch (e) {
                            this.forceLog("Could not register platform accessory! (" + accessory.name + ")" + e);
                          }
                          // accessory.platformAccessory.context = {device: device, uuid: uuid, eve: this.eve};
                          accessory.platformAccessory.context = {device : device, uuid : uuid};
                        }

                        for (var i = 0; i < this.accessories.length; i++) {
                          var removedAccessory = this.accessories[i];
                          var existingDevice = devices.find(function(existingDevice) { return existingDevice.idx == removedAccessory.idx; });

                          if (!existingDevice) {
                            removedAccessories.push(removedAccessory);
                            try {
                              this.api.unregisterPlatformAccessories("homebridge-sprinklerd", "sprinklerd", [ removedAccessory.platformAccessory ]);
                            } catch (e) {
                              this.forceLog("Could not unregister platform accessory! (" + removedAccessory.name + ")" + e);
                            }
                          }
                        }

                        for (var i = 0; i < removedAccessories.length; i++) {
                          var removedAccessory = removedAccessories[i];
                          var index = this.accessories.indexOf(removedAccessory);
                          this.accessories.splice(index, 1);
                        }

                        this.isSynchronizingAccessories = false;
                      }.bind(this),
                      function(response, err) {
                        Utils.LogConnectionError(this, response, err);
                        this.isSynchronizingAccessories = false;
                      }.bind(this));
  },
  configureAccessory : function(platformAccessory) {
    if (!platformAccessory.context || !platformAccessory.context.device) {
      // Remove this invalid device from the cache.
      try {
        this.api.unregisterPlatformAccessories("homebridge-sprinklerd", "sprinklerd", [ platformAccessory ]);
      } catch (e) {
        this.forceLog("Could not unregister cached platform accessory!" + e);
      }
      return;
    }

    var device = platformAccessory.context.device;
    var uuid = platformAccessory.context.uuid;

    console.log("Loading platform accessory! (" + device.name + " | " + uuid + ")");

    // Generate the already cached accessory again
    var accessory = new SprinklerdAccessory(this, platformAccessory, device.id, device.state, device.type, device.zone, device.name, device.duration, uuid);
    this.accessories.push(accessory);
  }
};

function setupMqttConnection(platform) {
  var connectionInformation = {
    host : (typeof platform.config.mqtt.host !== 'undefined' ? platform.config.mqtt.host : '127.0.0.1'),
    port : (typeof platform.config.mqtt.port !== 'undefined' ? platform.config.mqtt.port : 1883),
    topic : (typeof platform.config.mqtt.topic !== 'undefined' ? platform.config.mqtt.topic : 'sprinklerd'),
    username : (typeof platform.config.mqtt.username !== 'undefined' ? platform.config.mqtt.username : ''),
    password : (typeof platform.config.mqtt.password !== 'undefined' ? platform.config.mqtt.password : ''),
  };

  platform.forceLog("MQTT Connect info : " + platform.config.mqtt.host + ":" + platform.config.mqtt.port + " | topic : " + platform.config.mqtt.topic);

  var mqttError = function() {
    platform.forceLog(
        "There was an error while getting the MQTT Hardware Device from Sprinklerd.\nPlease verify that you have started sprinklerd enabeled MQTT and configured zones.");
  };

  platform.mqtt = new Mqtt(platform, connectionInformation.host, connectionInformation.port, connectionInformation.topic,
                           {username : connectionInformation.username, password : connectionInformation.password});
}