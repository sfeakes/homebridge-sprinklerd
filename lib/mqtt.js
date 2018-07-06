var mqtt = require('mqtt');
var platform;
var client;
var config = {host: "", port: 0, credentials: false, channel: ""};

module.exports = {
  Mqtt: Mqtt
}

function Mqtt(aPlatform, host, port, channel, credentials) {
  platform = aPlatform;

  config = {host: host, port: port, credentials: credentials, channel: channel};
  if (typeof config.credentials === 'undefined' || typeof config.credentials.username === 'undefined' || config.credentials.username.length == 0) {
    config.credentials = false;
  }
  this.connect();
}

Mqtt.prototype.connect = function() {
    var connectOptions = {
    host: config.host,
    port: config.port
  };

  if (config.credentials)
  {
    connectOptions.username = config.credentials.username;
    connectOptions.password = config.credentials.password;
  }

  platform.forceLog("Connecting MQTT broker to "+config.host+":"+config.port+" with topic "+config.channel);

  client = mqtt.connect(connectOptions);

  client.on('connect', function() {
    platform.forceLog("Successfully connected to MQTT broker.");
    client.subscribe(config.channel+"/#");
  });

  client.on('close', function(error) {
    client.end(true, function() {
      this.error("Retrying in 5 seconds...");
      setTimeout(function() {
        platform.forceLog("Retrying connection to MQTT broker...");
        this.connect();
      }.bind(this), 5000);
    }.bind(this));

  }.bind(this));

  client.on('error', function(error) {
    platform.forceLog("ERROR connecting to MQTT broker.");
    client.end(true, function() {
      this.error(error);
    }.bind(this));
  }.bind(this));

  client.on('message', function (topic, buffer) {
      //platform.log("MQTT Message "+topic.toString() + " state "+buffer.toString());
      var accessory = platform.accessories.find(function(acc) {
        if (topic.substring(topic.lastIndexOf("/")+1) == "set" ) {
          return false;
        } else if (config.channel.length == topic.lastIndexOf("/")) {
          id = topic.substring(config.channel.length+1);
        } else {
          id = topic.substring(config.channel.length+1, topic.lastIndexOf("/"));
        }
        return acc.id == id;
      });
      
      if (!accessory) {
        return;
      }
      accessory.handleMQTTMessage(topic.toString(), buffer.toString(), function(characteristic, value) {
        if (typeof value !== 'undefined' && typeof characteristic !== 'undefined') {
          characteristic.setValue(value, null, "sprinklerd-MQTT");
        }
      });
  });
}

Mqtt.prototype.send = function(topic, message) {
  if (client)
  {
    platform.log("MQTT send topic:'"+config.channel+"/"+topic+"' message:''"+message+"'");
    client.publish(config.channel+"/"+topic, message);
  }
}

Mqtt.prototype.error = function(error) {
  var logMessage = "Could not connect to MQTT broker! (" + config.host + ":" + config.port + ")\n";

  if (config.credentials !== false) {
    logMessage += "Note: You're using a username and password to connect. Please verify your username and password too.\n";
  }

  if (error) {
    logMessage += error;
  }

  platform.forceLog(logMessage);
};