define([ "message-bus", "task-tree", "d3" ], function(bus, taskTree) {

	var taskNames;
	var selectedTask;

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
		var selectedTasksJoin = d3.select(".gantt-chart").selectAll(".taskSelection").data(
				selectedTask != null ? [ selectedTask ] : []);
		selectedTasksJoin.exit().remove();
		selectedTasksJoin.enter().append("rect", ":first-child");
		var x1 = taskTree.getXScale()(taskTree.getTimeDomain()[0]);
		var x2 = taskTree.getXScale()(taskTree.getTimeDomain()[1]);
		var margin = 3;
		var y1 = taskTree.getYScale()(selectedTask) - margin;
		selectedTasksJoin.attr("class", "taskSelection")//
		.attr("y", 0)//
		.attr("transform", function(d) {
			var dates = taskTree.getTask(d).getPresentationTimeDomain();
			return "translate(" + x1 + "," + y1 + ")";
		})//
		.attr("width", x2 - x1)//
		.attr("height", taskTree.getYScale().rangeBand() + 2 * margin);

		var container = d3.select(".allscreen").node();
		container.scrollTop = y1 - container.clientHeight / 2;
	};

	bus.listen("keypress", function(e, d3Event) {
		var increment = -1;
		var up = d3Event.keyCode == 40 || d3Event.keyCode == 34;
		var down = d3Event.keyCode == 38 || d3Event.keyCode == 33;
		var big = d3Event.keyCode == 34 || d3Event.keyCode == 33;
		if ((up || down) && !d3Event.ctrlKey) {
			d3Event.preventDefault();
			var selectedIndex = getSelectedIndex();
			if (up) {
				if (selectedIndex == null) {
					selectedIndex = 0;
				} else {
					selectedIndex += big ? 10 : 1;
					if (selectedIndex > taskNames.length - 1) {
						selectedIndex = 0;
					}
				}
			} else if (down) {
				if (selectedIndex == null) {
					selectedIndex = taskNames.length - 1;
				} else {
					selectedIndex -= big ? 10 : 1;
					if (selectedIndex < 0) {
						selectedIndex = taskNames.length - 1
					}
				}
			}
			selectedTask = taskNames[selectedIndex];
			bus.send("selection-update", [ selectedTask ]);
			updateSelection();
		}
	});

	bus.listen("select-task", function(e, taskName) {
		selectedTask = taskName;
		bus.send("selection-update", [ selectedTask ]);
		updateSelection();
	});

	bus.listen("gantt-created", function() {
		taskNames = taskTree.getTaskNames();

		d3.select(".gantt-chart").selectAll(".y.axis .tick").on("click", function(d) {
			selectedTask = d;
			bus.send("selection-update", [ selectedTask ]);
			updateSelection();
		});

		if (getSelectedIndex() == null) {
			selectedTask = null;
		}
		bus.send("selection-update", [ selectedTask ]);
		updateSelection();
	});

});