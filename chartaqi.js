var ChartAQI = function () {
    var inst = this;
    var myChart;
    var latest = document.getElementById('latest');
    var proxyUrl = 'https://www.ocf.berkeley.edu/~grotter/aqi/json/?endpoint=';
    var sensors = [];

    var _loadData = function () {
        // clear data
        myChart.data.datasets = [];

        // custom sensors
        for (var i in sensors) {
            var sensor = sensors[i].split('|');
            if (typeof(sensor) != 'object') continue;
            if (sensor.length < 2) continue;

            inst.getData(sensor[0], sensor[1], i == 0);
        }

        return false;
    }

    var _isCustom = function (json) {
        if (!json.channel || !json.channel.name) return false;
        return json.channel.name.indexOf('ArduinoAQI') === 0;
    }

    this.updateLatest = function (data, name, isCustom) {
        if (!isCustom) name = 'PurpleAir / ' + name;

        var lastReadDate = new Date(data.created_at);
        latest.innerHTML = '<h3>' + name + '</h3>';
        latest.innerHTML += '<p><small>Latest read on ' + lastReadDate.toLocaleString('en-US') + '</small></p>';
        
        var val = isCustom ? parseFloat(data.field4) : CalculateAQI.getPM25AQI(parseFloat(data.field2));
        latest.innerHTML += '<h2>AQI ' + Math.round(val) + '</h2>';

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

    this.onSensorData = function (json, title) {
        var data = [];
        var isCustom = _isCustom(json);

        for (var i in json.feeds) {
            var feed = json.feeds[i];
            var val = 0;

            if (isCustom) {
                // already calculated
                val = parseFloat(feed.field4).toFixed(2);
            } else {
                // raw data from a PurpleAir sensor
                val = CalculateAQI.getPM25AQI(parseFloat(feed.field2)).toFixed(2);
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

    this.getThingSpeakEndpoint = function (id, key, results) {
        var endpoint = 'https://api.thingspeak.com/channels/' + id + '/feeds.json?metadata=true&api_key=' + key;

        if (typeof(results) == 'number') {
            endpoint += '&results=' + results;
        }

        return proxyUrl + encodeURIComponent(endpoint);
    }

    this.getResults = function () {
        var r = this.getQueryVariable('results');
        var results = parseInt(r) ? r : '100';
        return parseInt(results);
    }

    this.getData = function (id, key, isFirst) {
        var results = this.getResults();

        var endpoint = this.getThingSpeakEndpoint(id, key, results);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', endpoint, true);

        xhr.onload = function () {
            try {
                var json = JSON.parse(xhr.responseText);
                console.log(json);
                
                if (!json.feeds) {
                    latest.innerHTML = '<h1>API error</h1>';
                    return;
                }

                // graph sensor data
                var name = json.channel.name;
                if (!_isCustom(json)) name = 'PurpleAir / ' + name;
                
                inst.onSensorData(json, name);

                // update latest if first
                if (isFirst) {
                    var latestData = json.feeds[json.feeds.length - 1];
                    inst.updateLatest(latestData, json.channel.name, _isCustom(json));
                }
            } catch (err) {
                console.log(err);
            }
        }

        xhr.onerror = function (e) {
            console.log(e);
            latest.innerHTML = '<h1>Network error</h1>';
        }

        xhr.send();
    }

    this.initialize = function () {
        var vars = ['sensors', 'custom'];

        for (var i in vars) {
            var queryString = this.getQueryVariable(vars[i]);

            if (queryString) {
                sensors = sensors.concat(queryString.split(','));
            }
        }

        this.initChart();
        _loadData();
    }

    this.initialize();
}
