define([ "message-bus", "task-tree", "d3" ], function(bus, taskTree) {

	var interval = null;

	var FILTER = function(task) {
		var endDateInRange = task.getEndDate() > interval[0] && task.getEndDate() < interval[1];
		var startDateInRange = task.getStartDate() > interval[0]
				&& task.getStartDate() < interval[1];
		var rangeInTask = task.getStartDate() <= interval[0] && task.getEndDate() >= interval[1];
		return task.isGroup() || (endDateInRange || startDateInRange || rangeInTask);
	};

	bus.listen("deactivate-filter", function() {
		interval = null;
		bus.send("filter", [ null ]);
	});
	bus.listen("activate-filter", function(e, min, max) {
		interval = [ min, max ];
		bus.send("filter", [ FILTER ]);
	});
});