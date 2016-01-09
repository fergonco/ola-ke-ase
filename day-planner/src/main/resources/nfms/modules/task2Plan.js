define([ "message-bus", "task-tree", "d3" ], function(bus, taskTree) {

	var selectedTask;

	bus.listen("keypress", function(e, d3Event) {
		var left = d3Event.keyCode == 37;
		var right = d3Event.keyCode == 39;
		if (left || right) {
			var task = taskTree.getTask(selectedTask);
			task.plannedInDay = left;
			bus.send("refresh-tree");
		}
	});

	bus.listen("task-selected", function(e, task) {
		selectedTask = task
	});
});