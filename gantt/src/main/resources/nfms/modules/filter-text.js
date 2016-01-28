define([ "message-bus", "task-tree", "message-bus", "d3" ], function(bus, taskTree, bus) {

	var currentText = null;
	var status = [];

	var FILTER_TEXT = function(task) {
		return task.taskName.indexOf(currentText) != -1 || task.getContent().indexOf(currentText) != -1;
	};

	var input = d3.select("body").append("input").on("change", function() {
		currentText = input.node().value;
		if (currentText.trim().length == 0) {
			bus.send("deactivate-filter");
		} else {
			bus.send("filter", [ FILTER_TEXT ]);
		}
	});

});