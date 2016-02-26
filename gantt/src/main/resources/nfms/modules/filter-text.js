define([ "message-bus", "task-tree", "message-bus", "d3" ], function(bus, taskTree, bus) {

	var currentText = null;
	var status = [];

	var FILTER_TEXT = function(task) {
		return task.getLabel().toLowerCase().indexOf(currentText.toLowerCase()) != -1
				|| task.getContent().toLowerCase().indexOf(currentText.toLowerCase()) != -1;
	};

	var input = d3.select("body").append("input").on("keyup", function() {
		currentText = input.node().value;
		if (currentText.trim().length > 0) {
			bus.send("filter", [ FILTER_TEXT ]);
		}else {
			bus.send("filter", [ null ]);
		}
	}).on("focus", function() {
		bus.send("disable-keylistener");
	}).on("blur", function() {
		bus.send("enable-keylistener");
	});

});