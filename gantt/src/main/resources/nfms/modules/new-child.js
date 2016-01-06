define([ "message-bus", "task-tree", "d3" ], function(bus, taskTree) {

	var selectedTaskName;

	bus.listen("keypress", function(e, d3Event) {
		if (d3Event.keyCode == 45) {
			var parentTask = taskTree.getTask(selectedTaskName);
			var newTaskName = parentTask.createChild(d3Event.shiftKey);
			bus.send("refresh-tree");
			bus.send("select-task", [ newTaskName ]);
			bus.send("edit-selected-name");
		}
	});

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});
});