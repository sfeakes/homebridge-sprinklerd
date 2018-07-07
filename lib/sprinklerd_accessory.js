// var request = require("request");
var Constants = require('./constants.js');
// var Helper = require('./helper.js').Helper;
// var Domoticz = require('./domoticz.js').Domoticz;
// var eDomoticzServices = require('./services.js').eDomoticzServices;
// module.exports = eDomoticzAccessory;
var Mqtt = require('./mqtt.js').Mqtt;
var Utils = require('./utils.js').Utils;

var Sprinkler = require('./sprinkler.js').Sprinkler;
module.exports = SprinklerdAccessory;

function SprinklerdAccessory(platform, platformAccessory, id, state, type, zonenumber, name, duration, uuid) {
  this.services = [];
  this.platform = platform;
  this.zonenumber = zonenumber;
  this.name = name;
  this.type = type;
  this.id = id;
  //state == "on" ? this.state = true : this.state = false;
  this.state = Utils.toBool(state);
  this.duration = duration;
  this.remainingduration = 0;

  var voidCallback = function() {};

  this.platformAccessory = platformAccessory;
  if (!this.platformAccessory) {
    this.platformAccessory = new platform.api.platformAccessory(this.name, uuid);
  }
  this.platformAccessory.reachable = true;
  this.publishServices();
}

SprinklerdAccessory.prototype = {
  identify : function(callback) { callback(); },
  publishServices : function() {
    var services = this.getServices();
    for (var i = 0; i < services.length; i++) {
      var service = services[i];

      var existingService = this.platformAccessory.services.find(function(eService) { return eService.UUID == service.UUID; });

      if (!existingService) {
        this.platformAccessory.addService(service, this.name);
      }
    }
  },
  getService : function(name) {
    var service = false;
    try {
      service = this.platformAccessory.getService(name);
    } catch (e) {
      service = false;
    }

    if (!service) {
      var targetService = new name();
      service = this.platformAccessory.services.find(function(existingService) { return existingService.UUID == targetService.UUID; });
    }

    return service;
  },
  getCharacteristic : function(service, name) {
    var characteristic = false;
    try {
      characteristic = service.getCharacteristic(name);
    } catch (e) {
      this.platform.forceLog("^ For: " + this.name + " " + name.AccessoryInformation);
      characteristic = false;
    }

    if (!characteristic) {
      var targetCharacteristic = new name();
      characteristic = service.characteristics.find(function(existingCharacteristic) { return existingCharacteristic.UUID == targetCharacteristic.UUID; });
    }

    return characteristic;
  },
  gracefullyAddCharacteristic : function(service, characteristicType) {
    var characteristic = this.getCharacteristic(service, characteristicType);
    if (characteristic) {
      return characteristic;
    }

    return service.addCharacteristic(new characteristicType());
  },
  setState : function(state, callback, context) {
    // console.log("sprinklerd_accessory.setState '"+this.id+"' "+state+" '"+context+"'");
    if (context && context == "sprinklerd-MQTT") {
      //this.state = state == 1 ? true : false;
      this.state = Utils.toBool(state);
      if (this.state === false)
        this.remainingduration = 0;
      callback();
      return;
    }

    Sprinkler.updateDeviceStatus(this, state, function(success) { callback(); }.bind(this));
    // this.platform.mqtt.send(this.id+"/set", state?"1":"0");
    // callback();
  },
  getState : function(callback) {
    // console.log("sprinklerd_accessory.getState '"+this.id+"' "+this.state);
    callback(null, this.state);
    /*
    Sprinkler.deviceStatus(this, Constants.statusState, function (value) {
        if (!this.state) {
            callback(null, value);
        }
        this.state = value;
    }.bind(this));
    */
  },
  setDuration : function(value, callback, context) {
    // console.log("sprinklerd_accessory.setValue '"+this.id+"' "+value+" '"+context+"'");

    if (context && context == "sprinklerd-MQTT") {
      this.duration = value;
      callback();
      return;
    }

    // Set duration for every valve if we are "cycleallzones" button
    if (this.id == Constants.idCycleAllZones) {
      for (i = 1; i < this.zonenumber; i++) {
        this.platform.mqtt.send("zone" + i + "/duration/set", value.toString());
      }
      callback();
    } else { // det duration for single valve
      // this.platform.mqtt.send(this.id+"/duration/set", value.toString());
      Sprinkler.updateDeviceStatus(this, value, function(success) { callback(); }.bind(this), Constants.statusDuration);
    }
  },
  getDuration : function(callback) {
    // console.log("sprinklerd_accessory.getValue '"+this.id+"' "+this.duration);
    callback(null, this.duration);
    return;

    /*
    Sprinkler.deviceStatus(this, Constants.statusDuration, function (value) {
        if (!this.duration) {
            callback(null, value);
        }
        this.duration = value;
    }.bind(this));
    */
  },

  setRemainingDuration : function(valveService, value, callback, context) {
    // console.log("sprinklerd_accessory.setRemainingDuration '"+this.id+"' "+value);

    this.remainingduration = value;
    this.getCharacteristic(valveService, Characteristic.RemainingDuration).updateValue(value);
    callback();

  },
  getRemainingDuration : function(callback) {
    // console.log("sprinklerd_accessory.getRemainingDuration '"+this.id+"' "+this.remainingduration);
    callback(null, this.remainingduration);
    return;
  },
  getServices : function() {
    this.services = [];
    var informationService = this.getService(Service.AccessoryInformation);
    if (!informationService) {
      informationService = new Service.AccessoryInformation();
    }
    informationService.setCharacteristic(Characteristic.Manufacturer, "sprinklerd")
        .setCharacteristic(Characteristic.Model, this.Type)
        .setCharacteristic(Characteristic.SerialNumber, "Sprinklerd " + this.name);
    this.services.push(informationService);

    if (this.type === Constants.sdDeviceSwitch) {
      service = this.getService(Service.Switch);
      if (!service) {
        service = new Service.Switch(this.name);
      }
      this.getCharacteristic(service, Characteristic.On).on('set', this.setState.bind(this)).on('get', this.getState.bind(this));

    } else if (this.type === Constants.sdDeviceZone) {
      service = this.getService(Service.Valve);
      if (!service) {
        service = new Service.Valve(this.name);
      }
      service.setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.IRRIGATION);
      // this.getCharacteristic(service, Characteristic.On).on('set', this.setState.bind(this)).on('get', this.getState.bind(this));
      this.getCharacteristic(service, Characteristic.Active).on('set', this.setState.bind(this)).on('get', this.getState.bind(this));
      this.getCharacteristic(service, Characteristic.InUse).on('set', this.setState.bind(this)).on('get', this.getState.bind(this));
      this.getCharacteristic(service, Characteristic.RemainingDuration)
          .on('get', this.getRemainingDuration.bind(this))
          .on('set', this.setRemainingDuration.bind(this, service));
      if (this.id != Constants.idMasterValve) {
        this.getCharacteristic(service, Characteristic.SetDuration).on('set', this.setDuration.bind(this)).on('get', this.getDuration.bind(this));
      }
    }

    this.services.push(service);

    return this.services;
  },

  handleMQTTMessage : function(topic, message, callback) {
    this.platform.log("MQTT received for '%s'. Topic:'%s' Message:'%s'", this.id, topic, message);

    var value = parseInt(message) == 1 ? 1 : 0;
    var service = false;
    //var value = Utils.toBool(state);

    if (this.type === Constants.sdDeviceSwitch) {
      service = this.getService(Service.Switch);
      var characteristic = this.getCharacteristic(service, Characteristic.On);
    } else if (this.type === Constants.sdDeviceZone) {
      service = this.getService(Service.Valve);
      if (topic.substring(topic.lastIndexOf("/") + 1) == "duration") {
        var characteristic = this.getCharacteristic(service, Characteristic.SetDuration);
        value = parseInt(message);
      } else if (topic.substring(topic.lastIndexOf("/") + 1) == "remainingduration") {
        var characteristic = this.getCharacteristic(service, Characteristic.RemainingDuration);
        value = parseInt(message);
      } else {
        var characteristic = this.getCharacteristic(service, Characteristic.Active);
        callback(characteristic, value);
        var characteristic = this.getCharacteristic(service, Characteristic.InUse);
      }
    }

    callback(characteristic, value);
  }
}
