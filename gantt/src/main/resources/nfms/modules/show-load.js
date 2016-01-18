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
		var loadSelection = d3.select("#level4").selectAll(".load").data(loadData);
		loadSelection.exit().remove();
		loadSelection.enter().append("rect");
		var dayWidthPixels = xScale(new Date(timeDomain[0].getTime() + utils.DAY_MILLIS))
				- xScale(timeDomain[0]);
		var colors = [ "f", "f", "f", "f", "f", "f", "f", "a", "a", "a", "a", "7", "7", "7", "3", "3" ];
		loadSelection.attr("class", "load")//
		.attr("x", function(d, index) {
			return xScale(timeDomain[0].getTime() + index * utils.DAY_MILLIS);
		})//
		.attr("y", 0)//
		.attr("width", dayWidthPixels)//
		.attr("height", yScale.rangeBand() / 2)//
		.style("fill", function(d) {
			d = Math.round(d);
			if (d >= colors.length) {
				return "red";
			} else {
				var color = colors[d];
				return "#" + color + color + color;
			}
		}).on("click", function(d){
			console.log(d);
		});

	});
});