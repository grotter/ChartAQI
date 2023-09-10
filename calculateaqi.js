var CalculateAQI = {
	getAQI: function (I_high, I_low, C_high, C_low, C) {
		return (I_high - I_low) * (C - C_low) / (C_high - C_low) + I_low;
	},

	getPM25AQI: function (cPM25) {
		var b = this.getPM25Breakpoints(cPM25);
		return this.getAQI(b.iHi, b.iLo, b.cHi, b.cLo, cPM25);
	},

	getPM25Breakpoints: function (cPM25) {
		if (cPM25 <= 12) {
			return {
				iHi: 50,
				iLo: 0,
				cHi: 12,
				cLo: 0	
			};
		}

		if (cPM25 <= 35.4) {
			return {
				iHi: 100,
				iLo: 51,
				cHi: 35.4,
				cLo: 12.1
			};
		}

		if (cPM25 <= 55.4) {
			return {
				iHi: 150,
				iLo: 101,
				cHi: 55.4,
				cLo: 35.5
			};
		}

		if (cPM25 <= 150.4) {
			return {
				iHi: 200,
				iLo: 151,
				cHi: 150.4,
				cLo: 55.5
			};
		}

		if (cPM25 <= 250.4) {
			return {
				iHi: 300,
				iLo: 201,
				cHi: 250.4,
				cLo: 150.5
			};
		}

		if (cPM25 <= 350.4) {
			return {
				iHi: 400,
				iLo: 301,
				cHi: 350.4,
				cLo: 250.5
			};
		}

		return {
			iHi: 500,
			iLo: 401,
			cHi: 500.4,
			cLo: 350.5
		};
	},

	getCategory: function (AQI) {	  
		if (AQI <= 50) {
			return {
				level: 'Good',
				color: 'green'
			};
		}

		if (AQI <= 100) {
			return {
				level: 'Moderate',
				color: 'yellow'
			};
		}

		if (AQI <= 150) {
			return {
				level: 'Unhealthy for Sensitive Groups',
				color: 'orange'
			};
		}

		if (AQI <= 200) {
			return {
				level: 'Unhealthy',
				color: 'red'
			};
		}

		if (AQI <= 300) {  
			return {
				level: 'Very Unhealthy',
				color: 'purple'
			};
		}

		return {
			level: 'Hazardous',
			color: 'maroon'
		};
	}	
};
