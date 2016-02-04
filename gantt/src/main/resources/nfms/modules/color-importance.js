define([ "message-bus", "styleFunctionFactory", "task-tree", "d3" ], function(bus, styleFunctionFactory, taskTree) {

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Colorear por importancia").on("click", function() {
		bus.send("set-task-styler", styleFunctionFactory(function(task) {
			return task.getImportance();
		}, [ "f", "f", "f", "a", "a", "a", "7", "7", "3" ]));
	});

});