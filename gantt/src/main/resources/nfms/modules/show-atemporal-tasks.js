define([ "message-bus", "task-tree" ], function(bus, taskTree) {

	bus.listen("gantt-created", function() {
		var taskNames = [];
		taskTree.visitTasks(taskTree.ROOT, function(task) {
			return task.hasChildren() && !task.isGroup() && !task.isAtemporal();
		}, taskTree.VISIT_UNFOLDED_CHILDREN, function(task) {
			taskNames.push(task.taskName);
		});
		var selection = d3.select("#level4").selectAll(".taskAtemporalChildrenIndicator")
				.data(taskNames);
		selection.exit().remove();
		selection.enter().append("path");

		var size = taskTree.getYScale().rangeBand() / 2;
		selection.attr("class", "taskAtemporalChildrenIndicator")//
		.attr("d", function(d) {
			var dates = taskTree.getTask(d).getPresentationTimeDomain();
			var x = taskTree.getXScale()(dates[1]) - size - 5;
			var y1 = taskTree.getYScale()(d) + taskTree.getYScale().rangeBand() - size;
			var y2 = y1 + size;
			var ret = "M " + x + " " + y1 + " L " + x + " " + y2;
			for (var y = y1; y < y2; y += 2) {
				ret += " M " + x + " " + y + " L " + (x + size) + " " + y;
			}
			return ret;
		})//
		.attr("width", size)//
		.attr("height", size);

	});

});
