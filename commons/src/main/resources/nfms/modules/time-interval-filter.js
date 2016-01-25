define([], function() {

	var createTimeIntervalFilter = function(intervalGetter) {
		var filteringFunction = function(task) {
			var intervalStart = intervalGetter()[0];
			var intervalEnd = intervalGetter()[1];
			var endDateInRange = task.getEndDate() > intervalStart && task.getEndDate() < intervalEnd;
			var startDateInRange = task.getStartDate() > intervalStart && task.getStartDate() < intervalEnd;
			var rangeInTask = task.getStartDate() <= intervalStart && task.getEndDate() >= intervalEnd;
			return !task.isGroup() && (endDateInRange || startDateInRange || rangeInTask);
		}

		return filteringFunction;
	}

	return {
		"createTimeIntervalFilter" : createTimeIntervalFilter
	}
});