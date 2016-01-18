define([ "message-bus", "task-tree" ], function(bus, taskTree) {

	var selectedTaskName;

	bus.listen("keypress", function(e, d3Event) {
		if (d3Event.keyCode == 32 && selectedTaskName != null) {
			bus.send("toggle-folded-selected");
		}
	});

	bus.listen("toggle-folded-selected", function() {
		var task = taskTree.getTask(selectedTaskName);
		if (task.isGroup()) {
			task["folded"] = !task.isFolded();
			bus.send("refresh-tree");
		}
	});

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});
});
