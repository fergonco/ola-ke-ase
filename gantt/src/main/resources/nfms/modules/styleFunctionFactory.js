define([ "message-bus", "utils", "task-tree", "d3" ], function(bus, utils, taskTree) {

	function newStylingFunction(getter, colorList) {
		return function(d) {
			bus.send("set-task-styler", function(d) {
				var task = taskTree.getTask(d);
				var value = getter(task);
				var colors = colorList;
				if (value > colors.length) {
					return "fill: red";
				} else {
					var color = colors[value];
					return "stroke: #000000; stroke-width: 1px; fill: #" + color + color + color;
				}

			});
		};
	}

	return newStylingFunction;

});