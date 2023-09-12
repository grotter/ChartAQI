var ChartAQI = function () {
    var inst = this;
    var myChart;
    var latest = document.getElementById('latest');
    var isPurpleAirLoad = false;
    var proxyUrl = 'https://utility.calacademy.org/grotter/aqi/?endpoint=';
    var sensors = [];

    var range = {
        start: false,
        end: false
    };

    var _loadData = function (isPurpleAir) {
        if (isPurpleAir) {
            isPurpleAirLoad = true;
        }

        // clear data
        if (!isPurpleAir) myChart.data.datasets = [];

        // custom sensors
        for (var i in sensors) {
            var sensor = sensors[i].split('|');
            if (typeof(sensor) != 'object') continue;
            if (sensor.length < 2) continue;

            var isSensorPurpleAir = sensor[0].indexOf('purpleair-') === 0;

            if (isPurpleAir && !isSensorPurpleAir) continue;
            if (!isPurpleAir && isSensorPurpleAir) continue;
            
            inst.getData(sensor[0], sensor[1], i == 0);
        }

        return false;
    }

    var _isCustom = function (json) {
        if (!json.channel) return false;
        return true;
    }

    function _sortPurpleAirData (a, b) {
        if (a[0] === b[0]) {
            return 0;
        }

        return (a[0] < b[0]) ? -1 : 1;
    }

    this.updateLatest = function (data, name, isCustom) {
        var lastReadDate = isCustom ? new Date(data.created_at) : new Date(data[0] * 1000);
        latest.innerHTML = '<h3>' + name + '</h3>';
        latest.innerHTML += '<p><small>Latest read on ' + lastReadDate.toLocaleString('en-US') + '</small></p>';
        
        var val = isCustom ? parseFloat(data.field4) : CalculateAQI.getPM25AQI(parseFloat(data[1]));
        latest.innerHTML += '<h2>AQI ' + Math.round(val) + '</h2>';

        isPurpleAirLoad = false;

        if ('ontouchend' in document.documentElement) {
            latest.ontouchend = function () {
                _loadData();
            };
        } else {
            latest.onclick = function () {
                _loadData();
            };
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
        var results = this.getResults();
        var isCustom = _isCustom(json);
        
        if (!isCustom) {
            json.feeds = json.data.sort(_sortPurpleAirData);
        }
        
        if (json.feeds.length > results) {
            json.feeds = json.feeds.splice(results * -1);
        }

        for (var i in json.feeds) {
            var feed = json.feeds[i];
            var valX = 0;
            var valY = 0;

            if (isCustom) {
                valX = new Date(feed.created_at);

                if (i == 0) {
                    range.start = valX;
                }

                if (i == json.feeds.length - 1) {
                    range.end = valX;
                }

                // already calculated
                valY = parseFloat(feed.field4).toFixed(2);
            } else {
                valX = new Date(feed[0] * 1000);

                // raw data from a PurpleAir sensor
                valY = CalculateAQI.getPM25AQI(parseFloat(feed[2])).toFixed(2);
            }

            data.push({
                x: valX,
                y: valY
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

        if (!isPurpleAirLoad) _loadData(true);
    }

    this.getThingSpeakEndpoint = function (id, key, results) {
        var endpoint = 'https://api.thingspeak.com/channels/' + id + '/feeds.json?metadata=true&api_key=' + key;

        if (typeof(results) == 'number') {
            endpoint += '&results=' + results;
        }

        return proxyUrl + encodeURIComponent(endpoint);
    }

    this.getPurpleAirEndpoint = function (id, key) {
        var endpoint = 'https://map.purpleair.com/v1/sensors/' + id + '/history/?fields=pm2.5_atm_a,pm2.5_atm_b&read_key=' + key + '&token={PURPLEAIR_API_KEY}';

        if (range.start) {
            endpoint += '&start_timestamp=' + (new Date(range.start).getTime() / 1000);    
        }
        if (range.end) {
            endpoint += '&end_timestamp=' + (new Date(range.end).getTime() / 1000);    
        }

        return proxyUrl + encodeURIComponent(endpoint);
    }

    this.getEndpoint = function (id, key, results) {
        if (id.indexOf('purpleair-') === 0) {
            return this.getPurpleAirEndpoint(id.replace('purpleair-', ''), key);
        }

        return this.getThingSpeakEndpoint(id, key, results);
    }

    this.getResults = function () {
        var r = this.getQueryVariable('results');
        var results = parseInt(r) ? r : '100';
        return parseInt(results);
    }

    this.getData = function (id, key, isFirst) {
        var results = this.getResults();

        var endpoint = this.getEndpoint(id, key, results);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', endpoint, true);

        xhr.onload = function () {
            try {
                var json = JSON.parse(xhr.responseText);
                console.log(json);
                
                if (!json.feeds && !json.data) {
                    latest.innerHTML = '<h1>API error</h1>';
                    return;
                }

                var isCustom = _isCustom(json);

                // graph sensor data
                var name = isCustom ? json.channel.name : 'PurpleAir';
                
                inst.onSensorData(json, name);

                // update latest if first
                if (isFirst) {
                    var latestData = isCustom ? json.feeds[json.feeds.length - 1] : json.data[json.data.length - 1];
                    inst.updateLatest(latestData, name, isCustom);
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
