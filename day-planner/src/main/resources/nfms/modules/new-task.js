define([ "message-bus", "task-tree" ], function(bus, taskTree) {

	var selectedTaskName;

	bus.listen("keypress", function(e, d3Event) {
		if (d3Event.keyCode == 45) {
			var parentTask = taskTree.ROOT;
			var newTaskName = parentTask.createChild();
			bus.send("refresh-tree");
			bus.send("select-task", [ newTaskName ]);
			bus.send("edit-selected");
		}
	});

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});
});