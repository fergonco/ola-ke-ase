define([ "message-bus", "task-tree", "ui-generator", "text!task-schema.json" ], function(bus,
		taskTree, uiGenerator, taskSchema) {

	var selectedTaskName;

	bus.listen("keypress", function(e, d3Event) {
		if (d3Event.keyCode == 113 && d3Event.ctrlKey && selectedTaskName != null) {
			bus.send("edit-selected");
		}
	});

	bus.listen("edit-selected", function() {
		var task = taskTree.getTask(selectedTaskName);
		var input = d3.select("body").append("div")//
		.attr("id", "edit-content")//
		.attr("class", "editable");

		var generated = uiGenerator.populate("edit-content", "edit-content-element", JSON
				.parse(taskSchema), task);
		generated.formAccepted(function(object) {
			if (!task.setTaskName(object["taskName"])) {
				return false;
			}
			task["dailyDuration"] = object["dailyDuration"];
			task["content"] = object["content"];
			return true;
		});
		generated.formClosedOk(function() {
			input.remove();
			bus.send("refresh-tree");
			bus.send("select-task", [ task.taskName ]);
			bus.send("enable-keylistener");
		});
		generated.formClosedCancel(function() {
			input.remove();
			bus.send("enable-keylistener");
		});
		bus.send("disable-keylistener");
	});

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});

});
