define([ "message-bus", "task-tree", "message-bus", "d3" ], function(bus, taskTree, bus) {

	var currentText = null;
	var status = [];

	var FILTER_TEXT = function(task) {
		return task.taskName.indexOf(currentText) != -1 || task.getContent().indexOf(currentText) != -1;
	};

	var input = d3.select("body").append("input").on("keyup", function() {
		currentText = input.node().value;
		var results = taskTree.visitTasks(taskTree.ROOT, FILTER_TEXT, taskTree.VISIT_ALL_CHILDREN, taskTree.NAME_EXTRACTOR);
		if (results.length > 0) {
			var task = taskTree.getTask(results[0]).getParent();
			while (task != null) {
				if (task.isFolded()) {
					task.setFolded(false);
				}
				task = task.getParent();
			}
			bus.send("select-task", results[0]);
			bus.send("refresh-tree");
		}
	}).on("focus", function() {
		bus.send("disable-keylistener");
	}).on("blur", function() {
		bus.send("enable-keylistener");
	});

});