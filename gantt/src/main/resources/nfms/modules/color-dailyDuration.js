define([ "message-bus", "styleFunctionFactory", "task-tree", "d3" ], function(bus, styleFunctionFactory, taskTree) {

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Colorear por dedicación").on("click", function() {
		bus.send("set-task-styler", styleFunctionFactory(function(task) {
			return Math.round(3 * task.getDailyDuration());
		}, [ "f", "f", "a", "a", "7", "7", "3", "3" ]));
	});

});