define([ "message-bus", "task-tree", "d3" ], function(bus, taskTree) {

	var selectedTaskName;

	bus.listen("keypress", function(e, d3Event) {
		var deleteTask = d3Event.keyCode == 46;
		var archiveTask = d3Event.keyCode == 65;
		if (archiveTask || deleteTask) {
			var taskNames = taskTree.getTaskNames();
			var nextSelection = null;
			for (var i = 0; i < taskNames.length; i++) {
				if (taskNames[i] == selectedTaskName) {
					nextSelection = i != taskNames.length - 1 ? taskNames[i + 1] : taskNames[i - 1];
				}
			}

			if (archiveTask) {
				var task = taskTree.getTask(selectedTaskName);
				task.setArchived(!task.isArchived());
				bus.send("refresh-tree");
			}
			if (deleteTask) {
				var task = taskTree.getTask(selectedTaskName);
				task.getParent().removeChild(task);
				bus.send("refresh-tree");
			}

			if (nextSelection != null) {
				bus.send("select-task", [ nextSelection ]);
			}
		}
	});

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});
});