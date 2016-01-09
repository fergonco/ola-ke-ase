define([ "message-bus", "task-tree", "d3" ], function(bus, taskTree) {

	var taskNames;
	var selectedTask;
	var xScale, yScale;

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
		var selectedTasksJoin = d3.select(".chart").selectAll(".taskSelection").data(
				selectedTask != null ? [ selectedTask ] : []);
		selectedTasksJoin.exit().remove();
		selectedTasksJoin.enter().append("rect");
		var margin = 3;
		selectedTasksJoin.attr("class", "taskSelection")//
		.attr("x", function(d) {
			var task = taskTree.getTask(d);
			if (task.plannedInDay) {
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
			return yScale(task.dayStart) - margin;
		})//
		.attr("height", function(d) {
			var task = taskTree.getTask(d);
			var diff = yScale(task.dayEnd) - yScale(task.dayStart);
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
			updateSelection();
		}
	});

	bus.listen("new-scales", function(e, newXScale, newYScale) {
		xScale = newXScale;
		yScale = newYScale;
	});
	bus.listen("day-planned", function() {
		taskNames = taskTree.getTaskNames().slice(0);
		taskNames.sort(function(a, b) {
			return taskTree.getTask(a).dayStart - taskTree.getTask(b).dayStart;
		});
	});

});