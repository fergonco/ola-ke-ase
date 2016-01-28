define([ "message-bus", "task-tree", "utils" ], function(bus, taskTree, utils) {

	var selectedTaskName;

	bus.listen("keypress", function(e, d3Event) {
		if (selectedTaskName != null) {
			var left = d3Event.keyCode == 37;
			var right = d3Event.keyCode == 39;
			var resize = d3Event.shiftKey;
			if (!d3Event.ctrlKey && (left || right)) {
				var task = taskTree.getTask(selectedTaskName);
				var change;
				if (left) {
					change = -taskTree.getScaleUnit();
				} else if (right) {
					change = +taskTree.getScaleUnit();
				}
				var newDate = new Date(task.getStartDate().getTime() + change);
				task.setStartDate(utils.formatDate(newDate));
				if (!resize) {
					var newDate = new Date(task.getEndDate().getTime() + change);
					task.setEndDate(utils.formatDate(newDate));
				}
				bus.send("refresh-tree");
			}
		}
	});

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});
});
