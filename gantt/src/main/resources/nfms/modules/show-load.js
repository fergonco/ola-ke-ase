define([ "utils", "message-bus", "task-tree", "d3" ], function(utils, bus, taskTree) {
	bus.listen("gantt-created", function() {
		var timeDomain = taskTree.getTimeDomain();
		var xScale = taskTree.getXScale();
		var yScale = taskTree.getYScale();
		var tasks = taskTree.visitTasks(taskTree.ROOT, function(task) {
			return !task.isGroup();
		}, taskTree.VISIT_ALL_CHILDREN, function(task) {
			return task;
		});

		// Load
		var dayCount = Math.round((timeDomain[1].getTime() - timeDomain[0].getTime())
				/ utils.DAY_MILLIS);

		var loadData = [];
		for (var i = 0; i < dayCount; i++) {
			loadData.push(0);
		}
		for (var i = 0; i < tasks.length; i++) {
			var task = tasks[i];
			if (!task.isGroup()) {
				var start = Math.round(task.getStartDate().getTime() / utils.DAY_MILLIS)
						* utils.DAY_MILLIS;
				var end = task.getEndDate();
				for (var day = start; day < end.getTime(); day = day + utils.DAY_MILLIS) {
					var index = Math.round((day - timeDomain[0].getTime()) / utils.DAY_MILLIS);
					loadData[index] += task.getDailyDuration();
				}
			}
		}
		console.log(loadData);
		var loadSelection = d3.select("#level4").selectAll(".load").data(loadData);
		loadSelection.exit().remove();
		loadSelection.enter().append("rect");
		var dayWidthPixels = xScale(new Date(timeDomain[0].getTime() + utils.DAY_MILLIS))
				- xScale(timeDomain[0]);
		var colors = [ "f", "e", "d", "c", "b", "a", "9", "8", "7", "6", "5", "4", "3", "2", "1",
				"0" ];
		loadSelection.attr("class", "load")//
		.attr("x", function(d, index) {
			return xScale(timeDomain[0].getTime() + index * utils.DAY_MILLIS);
		})//
		.attr("y", 0)//
		.attr("width", dayWidthPixels)//
		.attr("height", yScale.rangeBand() / 2)//
		.style("fill", function(d) {
			if (d >= colors.length) {
				return "red";
			} else {
				var color = colors[Math.round(d)];
				return "#" + color + color + color;
			}
			return "blue";
		});

	});
});