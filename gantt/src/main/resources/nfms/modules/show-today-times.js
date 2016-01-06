define([ "message-bus", "task-tree", "utils", "d3" ], function(bus, taskTree, utils) {

	var selectedTaskName;

	bus.listen("keypress", function(e, d3Event) {
		if (d3Event.keyCode == 83 && selectedTaskName != null) {
			var task = taskTree.getTask(selectedTaskName);
			alert(utils.formatTime(task.getTimeRecordSum(utils.today, new Date(utils.today
					.getTime()
					+ utils.DAY_MILLIS))));
		}
	});

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});

});