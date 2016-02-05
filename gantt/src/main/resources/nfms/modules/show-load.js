define([ "utils", "message-bus", "task-tree", "d3" ], function(utils, bus, taskTree) {

	var timeDomain;
	var xScale;
	var yScale;

	function updateLoadSelection(loadSelection) {
		var container = d3.select(".allscreen").node();
		var timeDomain = taskTree.getTimeDomain();
		var xScale = taskTree.getXScale();
		var yScale = taskTree.getYScale();
		var dayWidthPixels = xScale(new Date(timeDomain[0].getTime() + utils.DAY_MILLIS)) - xScale(timeDomain[0]);
		var colors = [ "f", "f", "f", "f", "f", "a", "a", "a", "a", "7", "7", "7", "3" ];
		loadSelection.attr("class", "load")//
		.attr("x", function(d, index) {
			var task = taskTree.getTask(d.groupName);
			var taskTimeDomain = task.getTimeDomain(0);
			return xScale(taskTimeDomain[0].getTime() + d.groupIndex * utils.DAY_MILLIS);
		})//
		.attr("y", function(d) {
			return yScale(d.groupName);
		})//
		.attr("width", dayWidthPixels)//
		.attr("height", yScale.rangeBand() / 2)//
		.style("stroke", "black")//
		.style("fill", function(d) {
			var load = Math.round(d.load);
			if (load >= colors.length) {
				return "red";
			} else {
				var color = colors[load];
				return "#" + color + color + color;
			}
		})//
		.attr("title", function(d, index) {
			return d.groupName + ":" + d.load + "h (" + new Date(timeDomain[0].getTime() + index * utils.DAY_MILLIS) + ")";
		});
	}

	bus.listen("gantt-created", function() {
		var timeDomain = taskTree.getTimeDomain();
		var groups = taskTree.visitTasksIgnoreUserFilter(taskTree.ROOT, function(task) {
			return task != taskTree.ROOT && task.isGroup();
		}, taskTree.VISIT_UNFOLDED_CHILDREN, function(task) {
			return task;
		});
		var loadData = [];
		for (var i = 0; i < groups.length; i++) {
			var groupLoadData = [];
			var groupTimeDomain = groups[i].getTimeDomain(0);
			var dayCount = Math.round((groupTimeDomain[1].getTime() - groupTimeDomain[0].getTime()) / utils.DAY_MILLIS);
			for (var j = 0; j < dayCount; j++) {
				groupLoadData.push({
					groupName : groups[i].getTaskName(),
					groupIndex : j,
					load : 0
				});
			}
			var tasks = taskTree.visitTasksIgnoreUserFilter(groups[i], function(task) {
				return !task.isGroup();
			}, taskTree.VISIT_ALL_CHILDREN, function(task) {
				return task;
			});
			for (var j = 0; j < tasks.length; j++) {
				var task = tasks[j];
				var start = Math.round(task.getStartDate().getTime() / utils.DAY_MILLIS) * utils.DAY_MILLIS;
				var end = task.getEndDate();
				for (var day = start; day < end.getTime(); day = day + utils.DAY_MILLIS) {
					var index = Math.round((day - groupTimeDomain[0].getTime()) / utils.DAY_MILLIS);
					groupLoadData[index]["load"] += task.getDailyDuration();
				}
			}

			loadData = loadData.concat(groupLoadData);
		}

		var loadSelection = d3.select("#level4").selectAll(".load").data(loadData);
		loadSelection.exit().remove();
		loadSelection.enter().append("rect");
		updateLoadSelection(loadSelection);
	});

	bus.listen("selection-update", function() {
		updateLoadSelection(d3.select("#level4").selectAll(".load"));
	});
});