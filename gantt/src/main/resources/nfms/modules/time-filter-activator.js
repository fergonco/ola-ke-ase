define([ "message-bus", "task-tree", "time-interval-filter", "d3" ], function(bus, taskTree, timeIntervalFilter) {

	var interval = null;

	var FILTER = timeIntervalFilter.createTimeIntervalFilter(function() {
		return interval;
	});

	bus.listen("deactivate-filter", function() {
		interval = null;
		bus.send("filter", [ null ]);
	});
	bus.listen("activate-filter", function(e, min, max) {
		interval = [ min, max ];
		bus.send("filter", [ FILTER ]);
	});
});