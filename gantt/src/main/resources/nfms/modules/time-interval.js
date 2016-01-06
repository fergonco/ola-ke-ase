define([ "message-bus", "task-tree", "d3" ], function(bus, taskTree) {

	var interval = null;

	var FILTER = function(task) {
		var endDateInRange = task.getEndDate() > interval[0] && task.getEndDate() < interval[1];
		var startDateInRange = task.getStartDate() > interval[0]
				&& task.getStartDate() < interval[1];
		var rangeInTask = task.getStartDate() <= interval[0] && task.getEndDate() >= interval[1];
		return task.isGroup() || (endDateInRange || startDateInRange || rangeInTask);
	};

	var updateTimeMarker = function(timeMarkerSelection) {
		timeMarkerSelection.attr("class", "timeMarker")//
		.attr("d", function(d) {
			var x = taskTree.getXScale()(interval[d]);
			var y0 = 0;
			var taskNames = taskTree.getTaskNames();
			var y1 = taskTree.getYScale()(taskNames[taskNames.length - 1]);
			return "M " + x + " " + y0//
					+ " L " + (x - 5) + " " + (y0 - 5)//
					+ " L " + (x - 5) + " " + (y0 - 10)//
					+ " L " + (x + 5) + " " + (y0 - 10)//
					+ " L " + (x + 5) + " " + (y0 - 5)//
					+ " L " + x + " " + y0//
					+ " L " + x + " " + y1;

			var ret = "M " + x + " " + y1 + " L " + x + " " + y2;
			for (var y = y1; y < y2; y += 2) {
				ret += " M " + x + " " + y + " L " + (x + size) + " " + y;
			}
			return ret;

		});
	}

	var refreshTimeMarkers = function() {
		var data = [];
		if (interval != null) {
			data = [ 0, 1 ];
		}

		var timeMarkerSelection = d3.select(".gantt-chart").selectAll(".timeMarker").data(data);
		timeMarkerSelection.exit().remove();
		timeMarkerSelection.enter().append("path");
		updateTimeMarker(timeMarkerSelection);

		// drag and drop
		var dx;
		var sourceX;
		var drag = d3.behavior.drag().on("dragstart", function(d) {
			dx = 0;
			sourceX = taskTree.getXScale()(new Date(interval[d]));
		}).on("drag", function(d) {
			dx += d3.event.dx;
			var newDate = taskTree.getXScale().invert(sourceX + dx);
			interval[d] = newDate.getTime();
			updateTimeMarker(d3.select(this));
		}).on("dragend", function(d) {
			bus.send("activate-filter", [ interval[0], interval[1] ]);
		});
		timeMarkerSelection.call(drag);
	};

	bus.listen("gantt-created", function() {
		refreshTimeMarkers();
	});

	bus.listen("deactivate-filter", function() {
		interval = null;
		refreshTimeMarkers();
		bus.send("filter", [ null ]);
	});
	bus.listen("activate-filter", function(e, min, max) {
		interval = [ min, max ];
		refreshTimeMarkers();
		bus.send("filter", [ FILTER ]);
	});
});