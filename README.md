# ChartAQI

A small graph built on [Chart.js](https://github.com/chartjs/Chart.js) to view [ArduinoAQI](https://github.com/grotter/ArduinoAQI) and PurpleAir sensor data. To retrieve ThingSpeak API keys and sensor IDs from publicly accessible PurpleAir sensors, inspect data from the [PurpleAir API](https://api.purpleair.com/#api-sensors).

The graph uses the following GET variables:

* `sensors` - A comma-delimited collection of ThingSpeak sensor IDs and read API keys, e.g. sensors=123|asdf,345|qwer
* `results` (optional) - Number of results, defaults to 100

### ♥ Antifascist Science Club
