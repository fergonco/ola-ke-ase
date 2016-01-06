define([ "message-bus", "task-tree" ], function(bus, taskTree) {

	var selectedTaskName;
	var taskWithOpenTimeRecord;
	var timerId;

	bus.listen("keypress", function(e, d3Event) {
		if (d3Event.keyCode == 84 && !d3Event.shiftKey && selectedTaskName != null) {
			var task = taskTree.getTask(selectedTaskName);
			if (task.isAtemporal()) {
				window.clearInterval(timerId);
				if (task.hasOpenTimeRecord()) {
					task.stopTimeRecord(new Date().getTime());
					taskWithOpenTimeRecord = null;
				} else {
					if (taskWithOpenTimeRecord != null) {
						taskTree.getTask(taskWithOpenTimeRecord).stopTimeRecord(
								new Date().getTime());
					}
					task.startTimeRecord(new Date().getTime());
					taskWithOpenTimeRecord = selectedTaskName;
					timerId = window.setInterval(function() {
						bus.send("refresh-task", taskWithOpenTimeRecord);
					}, 1000);
				}
				bus.send("refresh-tree");
			}
		}
	});

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});

	bus.listen("gantt-created", function() {
		var taskNames = [];
		if (taskWithOpenTimeRecord != null) {
			var task = taskTree.getTask(taskWithOpenTimeRecord);
			while (task != taskTree.ROOT) {
				taskNames.push(task.taskName);
				task = task.getParent();
			}
		}
		var selection = d3.select(".gantt-chart").selectAll(".taskTimer").data(taskNames);
		selection.exit().remove();
		selection.enter().append("circle");

		var r = 5;
		selection.attr("class", "taskTimer")//
		.attr("transform", function(d) {
			var dates = taskTree.getTask(d).getPresentationTimeDomain();
			var x = taskTree.getXScale()(dates[0]) + 2 * r;
			var y = taskTree.getYScale()(d) + taskTree.getYScale().rangeBand() / 2;
			return "translate(" + x + "," + y + ")";
		})//
		.attr("r", r + "px");
	});
});
