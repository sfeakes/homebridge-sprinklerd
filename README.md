# homebridge-sprinklerd

## Homebridge platform plugin for SprinklerD

## Installation prerequisites

1) Install [SprinklerD](https://github.com/sfeakes/SprinklerD)
2) Install [Homebridge](https://github.com/nfarina/homebridge) on any machine
3) Optional install [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x)

## Installation

**Option 1: Install via Homebridge Config UI X:**

 1. Navigate to the Plugins page in in [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x).
 2. Search for "sprinklerd" and install homebridge-aqualinkd.

**Option 2: Manually Install:**
 1. Install this on same machine as homebridge.

```
sudo npm install -g homebridge-sprinklerd
```

## Update

**Option 1: Update via Homebridge Config UI X:**

 1. Navigate to the Plugins page in [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x).
 2. Click the Update button for the SprinklerD plugin.

**Option 2: Manually Update:**
```
sudo npm update -g homebridge-sprinklerd
```

## Configuration

**Option 1: Configuration via Homebridge Config UI X:**

 1. Navigate to the Plugins page in homebridge-config-ui-x.
 2. Click the Settings button for the SprinklerD plugin.

**Option 2: Manually Configuration:**

Edit homebridge config.json<br>
Example config
```
"platforms": [
        {
            "platform": "sprinklerd",
            "name": "SprinklerD",
            "server": "my-server-or-ip-running-sprinklerd",
            "port": "80",
            "mqtt": {
              "host": "my-mqtt-server",
              "port": 1883,
              "topic": "sprinklerd"
            }
       }
    ],
```