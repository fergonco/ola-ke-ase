define([ "message-bus", "task-tree", "d3" ], function(bus, taskTree) {

	var taskNames;
	var selectedTask;
	var xScale, yScale;
	var currentDay;

	var getSelectedIndex = function() {
		if (selectedTask != null) {
			for (var i = 0; i < taskNames.length; i++) {
				if (taskNames[i] == selectedTask) {
					return i;
				}
			}
		}

		return null;
	}

	var updateSelection = function() {
		var selectedTasksJoin = d3.select(".chart").selectAll(".taskSelection").data(selectedTask != null ? [ selectedTask ] : []);
		selectedTasksJoin.exit().remove();
		selectedTasksJoin.enter().append("rect");
		var margin = 3;
		selectedTasksJoin.attr("class", "taskSelection")//
		.attr("x", function(d) {
			var task = taskTree.getTask(d);
			if (task.isPlannedInDay()) {
				return xScale(1);
			} else {
				return xScale(51);
			}
		})//
		.attr("width", function(d) {
			return xScale(49);
		})//
		.attr("y", function(d, i) {
			var task = taskTree.getTask(d);
			return yScale(task.getDayStart()) - margin;
		})//
		.attr("height", function(d) {
			var task = taskTree.getTask(d);
			var diff = yScale(task.getDayEnd(currentDay)) - yScale(task.getDayStart());
			return diff + 2 * margin;
		});
	};

	bus.listen("keypress", function(e, d3Event) {
		var up = d3Event.keyCode == 40 || d3Event.keyCode == 34;
		var down = d3Event.keyCode == 38 || d3Event.keyCode == 33;
		if (up || down) {
			d3Event.preventDefault();
			var selectedIndex = getSelectedIndex();
			if (up) {
				if (selectedIndex == null) {
					selectedIndex = 0;
				} else {
					selectedIndex += 1;
					if (selectedIndex > taskNames.length - 1) {
						selectedIndex = 0;
					}
				}
			} else if (down) {
				if (selectedIndex == null) {
					selectedIndex = taskNames.length - 1;
				} else {
					selectedIndex -= 1;
					if (selectedIndex < 0) {
						selectedIndex = taskNames.length - 1
					}
				}
			}
			selectedTask = taskNames[selectedIndex];
			bus.send("selection-update", selectedTask);
			updateSelection();
		}
	});

	bus.listen("select-task", function(e, taskName) {
		if (taskNames.indexOf(taskName) != -1) {
			selectedTask = taskName;
			bus.send("selection-update", [ selectedTask ]);
			updateSelection();
		}
	});

	bus.listen("new-scales", function(e, newXScale, newYScale) {
		xScale = newXScale;
		yScale = newYScale;
	});
	bus.listen("day-planned", function(e, dayTaskNames) {
		taskNames = dayTaskNames;
		taskNames.sort(function(a, b) {
			return taskTree.getTask(a).getDayStart() - taskTree.getTask(b).getDayStart();
		});
		updateSelection();
	});

	bus.listen("day-set", function(e, start, end) {
		currentDay = start;
	});
});