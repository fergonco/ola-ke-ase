define([ "message-bus", "task-tree", "utils" ], function(bus, taskTree, utils) {

	var selectedTaskName;

	bus.listen("keypress", function(e, d3Event) {
		if (selectedTaskName != null) {
			var left = d3Event.keyCode == 37;
			var right = d3Event.keyCode == 39;
			var down = d3Event.keyCode == 40;
			var up = d3Event.keyCode == 38;
			if (d3Event.ctrlKey && (left || right || up || down)) {
				task = taskTree.getTask(selectedTaskName);
				if (left) {
					task.moveToParentLevel();
				} else if (right) {
					task.moveToNextBrother();
				} else if (up) {
					task.moveUp();
				} else {
					task.moveDown()
				}
				bus.send("refresh-tree");
			}
		}
	});

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});
});
