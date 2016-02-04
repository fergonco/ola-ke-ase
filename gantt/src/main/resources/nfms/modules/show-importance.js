define([ "message-bus", "utils", "task-tree", "d3" ], function(bus, utils, taskTree) {

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Colorear por importancia").on("click", function() {
		bus.send("set-task-styler", function(d) {
			var task = taskTree.getTask(d);
			var importance = task.getImportance();
			var colors = [ "f", "f", "f", "a", "a", "a", "7", "7", "3" ];
			if (importance > colors.length) {
				return "fill: red";
			} else {
				var color = colors[importance];
				return "stroke: #000000; stroke-width: 1px; fill: #" + color + color + color;
			}

		});
	});

});