define([ "message-bus", "task-tree" ], function(bus, taskTree) {

	var itsUs = false;
	var lastSelection = null;

	bus.listen("selection-update", function(e, taskName) {
		lastSelection = taskName;

		if (!itsUs) {
			bus.send("websocket-send-json", {
				"type" : "update-selection",
				"task-name" : taskName
			});
		}
	});

	bus.listen("websocket-receive", function(e, data) {
		if (data["type"] == "update-selection") {
			var taskName = data["task-name"];
			if (taskName != lastSelection) {
				var task = taskTree.getTask(taskName).getParent();
				while (task != null) {
					task.setFolded(false);
					task = task.getParent();
				}
				itsUs = true;
				bus.send("select-task", taskName);
				itsUs = false;
				bus.send("refresh-tree");
			}
		}
	});

});