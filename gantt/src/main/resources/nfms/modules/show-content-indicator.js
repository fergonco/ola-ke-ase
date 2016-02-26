define([ "message-bus", "task-tree" ], function(bus, taskTree) {

	bus.listen("gantt-created", function() {
		var taskNames = [];
		taskTree.visitTasks(taskTree.ROOT, function(task) {
			return task.getContent() != "";
		}, taskTree.VISIT_UNFOLDED_CHILDREN, function(task) {
			taskNames.push(task.getTaskName());
		});
		var selection = d3.select("#level4").selectAll(".taskContentIndicator")
				.data(taskNames);
		selection.exit().remove();
		selection.enter().append("rect");

		var size = taskTree.getYScale().rangeBand() / 2;
		selection.attr("class", "taskContentIndicator")//
		.attr("x", function(d) {
			var dates = taskTree.getTask(d).getPresentationTimeDomain();
			return taskTree.getXScale()(dates[1]) - size - 5;
		})//
		.attr("y", function(d) {
			return taskTree.getYScale()(d);
		})//
		.attr("width", size)//
		.attr("height", size);

	});
});
