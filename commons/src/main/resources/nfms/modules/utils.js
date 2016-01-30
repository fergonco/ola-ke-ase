define([], function() {
	var today = new Date();
	today.setUTCHours(0);
	today.setUTCMinutes(0);
	today.setUTCSeconds(0);
	today.setUTCMilliseconds(0);

	var formatDate = function(date) {
		return (date.getUTCMonth() + 1) + "/" + date.getUTCDate() + "/" + date.getUTCFullYear()
				+ " " + date.getUTCHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
				+ " UTC";
	}

	var formatTime = function(timeSum) {
		var hours = Math.trunc(timeSum / (60 * 60 * 1000));
		var minutes = Math.trunc((timeSum % (60 * 60 * 1000)) / (60 * 1000));
		var seconds = Math.trunc((timeSum % (60 * 1000)) / 1000);
		var ret = "";
		if (hours > 0) {
			ret += hours + "h";
		}
		if (minutes > 0) {
			ret += minutes + "m";
		}
		if (seconds > 0) {
			ret += seconds + "s";
		}

		return ret;
	}
	return {
		"DAY_MILLIS" : 24 * 60 * 60 * 1000,
		"today" : today,
		"formatDate" : formatDate,
		"formatTime" : formatTime
	}
});