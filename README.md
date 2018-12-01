# homebridge-sprinklerd

## Homebridge platform plugin for SprinklerD

### Install
(`sudo npm` is flakey as hell due to re-spawning, so depending on your setup is may be best to become root then run the below)

`npm install https://github.com/sfeakes/homebridge-sprinklerd.git`

Then add the platform details to homebridge config.json
```
"platforms": [
        {
            "platform": "sprinklerd",
            "name": "sprinklerd",
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


#### This was based on a fork taken from homepridge-edomoticz.
