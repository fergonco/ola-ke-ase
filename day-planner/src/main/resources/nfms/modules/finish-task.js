define([ "message-bus", "task-tree" ], function(bus, taskTree) {

	var selectedTask;
	var day;

	bus.listen("keypress", function(e, d3Event) {
		if (d3Event.keyCode == 46 && selectedTask != null) {
			var task = taskTree.getTask(selectedTask);
			task.setDayFinished(!task.isDayFinished(day), day);
			bus.send("refresh-task", [ selectedTask ]);
		}
	});

	bus.listen("selection-update", function(e, task) {
		selectedTask = task
	});

	bus.listen("day-planned", function(e, dayTaskNames, currentDay) {
		day = currentDay;
	});
});
