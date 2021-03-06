var ChartAQI = function () {
    var inst = this;
    var myChart;
    var latest = document.getElementById('latest');
    
    var sensors = {
        custom: [],
        purpleair: []
    };

    var _loadData = function () {
        // clear data
        myChart.data.datasets = [];

        // custom sensors
        for (var i in sensors.custom) {
            var sensor = sensors.custom[i].split('|');
            if (typeof(sensor) != 'object') continue;
            if (sensor.length < 2) continue;

            inst.getCustomData(sensor[0], sensor[1], i == 0);
        }

        // purpleair sensors
        for (var i in sensors.purpleair) {
            inst.getPurpleAirData(sensors.purpleair[i]);
        }

        return false;
    }

    this.updateLatest = function (data, name) {
        var lastReadDate = new Date(data.created_at);
        latest.innerHTML = '<h3>' + name + '</h3>';
        latest.innerHTML += '<p><small>Latest read on ' + lastReadDate.toLocaleString('en-US') + '</small></p>';
        latest.innerHTML += '<h2>AQI ' + Math.round(parseFloat(data.field4)) + '</h2>';

        if ('ontouchend' in document.documentElement) {
            latest.ontouchend = _loadData;
        } else {
            latest.onclick = _loadData;
        }
    }

    this.initChart = function () {
        myChart = new Chart('chart', {
            type: 'line',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    position: 'bottom'
                },
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            tooltipFormat: 'M/D/YYYY, h:mm:ss A'
                        },
                        scaleLabel: {
                            display: false,
                            fontStyle: 'bold',
                            labelString: 'Time'
                        }
                    }],
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            fontStyle: 'bold',
                            labelString: 'AQI'
                        }
                    }]
                }
            }
        });
    }

    this.getQueryVariable = function (variable) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');

        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');

            if (decodeURIComponent(pair[0]) == variable) {
                return decodeURIComponent(pair[1]);
            }
        }

        return false;
    }

    this.getRandomColor = function (alpha) {
        var ran = function () {
            return Math.round(Math.random() * 255);
        }

        return 'rgba(' + ran() + ', ' + ran() + ', ' + ran() + ', ' + alpha + ')';
    }

    this.onSensorData = function (json, title, isCustom) {
        var data = [];

        for (var i in json.feeds) {
            var feed = json.feeds[i];
            var val = 0;

            if (isCustom) {
                // already calculated
                val = parseFloat(feed.field4).toFixed(2);
            } else {
                // raw data from a PurpleAir sensor
                val = CalculateAQI.getPM25AQI(parseFloat(feed.field8)).toFixed(2);
            }

            data.push({
                x: new Date(feed.created_at),
                y: val
            });
        }

        var border = isCustom ? 3 : 1;
        var color = isCustom ? 'black' : this.getRandomColor(.75);

        // custom color from channel metadata
        if (isCustom && json.channel.metadata) {
            try {
                var metadata = JSON.parse(json.channel.metadata);
                
                if (metadata.color) {
                    color = metadata.color;
                }
            } catch (e) {
                console.log(e);
            }
        }

        var myData = {
            label: title,
            fill: false,
            borderWidth: border,
            pointRadius: 7,
            backgroundColor: color,
            borderColor: color,
            pointHoverBackgroundColor: color,
            pointBackgroundColor: 'rgba(0,0,0,0)',
            pointBorderColor: 'rgba(0,0,0,0)',
            data: data
        };

        myChart.data.datasets.push(myData);
        myChart.update();
    }

    this.onPurpleAirData = function (result) {
        var numResults = this.getResults();
        var endpoint = this.getThingSpeakEndpoint(result.THINGSPEAK_PRIMARY_ID, result.THINGSPEAK_PRIMARY_ID_READ_KEY, numResults);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', endpoint, true);

        xhr.onload = function () {
            var json = JSON.parse(xhr.responseText);
            
            if (json.feeds) {
                inst.onSensorData(json, 'PurpleAir / ' + result.Label);
            }
        }

        xhr.onerror = function (e) {
            console.log(e);
        }

        xhr.send();
    }

    this.getPurpleAirData = function (id) {
        var endpoint = 'https://www.purpleair.com/json?show=' + id;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', endpoint, true);

        xhr.onload = function() {
            var json = JSON.parse(xhr.responseText);
            if (!json.results) return;

            inst.onPurpleAirData(json.results[0]);
        }

        xhr.onerror = function (e) {
            console.log(e);
        }

        xhr.send();
    }

    this.getThingSpeakEndpoint = function (id, key, results) {
        var endpoint = 'https://api.thingspeak.com/channels/' + id + '/feeds.json?metadata=true&api_key=' + key;

        if (typeof(results) == 'number') {
            endpoint += '&results=' + results;
        }

        return 'https://www.ocf.berkeley.edu/~grotter/aqi/json/?endpoint=' + encodeURIComponent(endpoint);
    }

    this.getResults = function () {
        var r = this.getQueryVariable('results');
        var results = parseInt(r) ? r : '100';
        return parseInt(results);
    }

    this.getCustomData = function (id, key, isFirst) {
        var results = this.getResults();

        var endpoint = this.getThingSpeakEndpoint(id, key, results);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', endpoint, true);

        xhr.onload = function () {
            var json = JSON.parse(xhr.responseText);
            console.log(json);
            
            if (!json.feeds) {
                latest.innerHTML = '<h1>API error</h1>';
                return;
            }

            // graph sensor data
            inst.onSensorData(json, json.channel.name, true);

            // update latest if first
            if (isFirst) {
                var latestData = json.feeds[json.feeds.length - 1];
                inst.updateLatest(latestData, json.channel.name);
            }
        }

        xhr.onerror = function (e) {
            console.log(e);
            latest.innerHTML = '<h1>Network error</h1>';
        }

        xhr.send();
    }

    this.initialize = function () {
        for (var i in sensors) {
            var myVal = this.getQueryVariable(i);
            if (myVal === false) continue;

            sensors[i] = myVal.split(',');
        }

        this.initChart();
        _loadData();
    }

    this.initialize();
}
