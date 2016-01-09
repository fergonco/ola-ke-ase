define([ "message-bus", "task-tree" ], function(bus, taskTree) {

	var selectedTask;
	var taskWithOpenTimeRecord;
	var timerId;

	bus.listen("keypress", function(e, d3Event) {
		if (d3Event.keyCode == 84 && selectedTask != null) {
			var task = taskTree.getTask(selectedTask);
			window.clearInterval(timerId);
			if (task.hasOpenTimeRecord()) {
				task.stopTimeRecord(new Date().getTime());
				taskWithOpenTimeRecord = null;
			} else {
				if (taskWithOpenTimeRecord != null) {
					taskTree.getTask(taskWithOpenTimeRecord).stopTimeRecord(new Date().getTime());
				}
				task.startTimeRecord(new Date().getTime());
				taskWithOpenTimeRecord = selectedTask;
				timerId = window.setInterval(function() {
					bus.send("refresh-task", taskWithOpenTimeRecord);
				}, 1000);
			}
			bus.send("refresh-tree");
		}
	});

	bus.listen("task-selected", function(e, task) {
		selectedTask = task
	});

});
