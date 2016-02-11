define([ "utils", "message-bus", "task-tree", "d3" ], function(utils, bus, taskTree) {

	var NONE = 0, ROOT = 1, GROUPS = 2;

	var mode = 0;
	var timeDomain;
	var xScale;
	var yScale;

	function updateLoadSelection(loadSelection) {
		var container = d3.select(".allscreen").node();
		var timeDomain = taskTree.getTimeDomain();
		var xScale = taskTree.getXScale();
		var yScale = taskTree.getYScale();
		var dayWidthPixels = xScale(new Date(timeDomain[0].getTime() + utils.DAY_MILLIS)) - xScale(timeDomain[0]);
		loadSelection.attr("class", "load")//
		.attr("x", function(d, index) {
			var task;
			if (d.groupName == "root") {
				task = taskTree.ROOT;
			} else {
				task = taskTree.getTask(d.groupName);
			}
			var taskTimeDomain = task.getTimeDomain(0);
			return xScale(taskTimeDomain[0].getTime() + d.groupIndex * utils.DAY_MILLIS);
		})//
		.attr("y", function(d) {
			if (d.groupName == "root") {
				return 0;
			} else {
				return yScale(d.groupName);
			}
		})//
		.attr("width", dayWidthPixels)//
		.attr("height", yScale.rangeBand() / 2)//
		.style("stroke", "black")//
		.style("fill", function(d) {
			var task;
			if (d.groupName == "root") {
				task = taskTree.ROOT;
			} else {
				task = taskTree.getTask(d.groupName);
			}
			var min = task.getDedicationLowerLimit();
			var max = task.getDedicationUpperLimit();

			if (max != null && d.load > max) {
				return "red";
			} else if (min != null && d.load < min) {
				return "blue";
			} else {
				return "white";
			}
		})//
		.attr("title", function(d, index) {
			return d.groupName + ":" + d.load + "h (" + new Date(timeDomain[0].getTime() + index * utils.DAY_MILLIS) + ")";
		});
	}

	function refresh() {
		var timeDomain = taskTree.getTimeDomain();
		var groups = null;
		if (mode == GROUPS) {
			groups = taskTree.visitTasksIgnoreUserFilter(taskTree.ROOT, function(task) {
				return task != taskTree.ROOT && task.isGroup();
			}, taskTree.VISIT_UNFOLDED_CHILDREN, function(task) {
				return task;
			});
		} else if (mode == ROOT) {
			groups = [ taskTree.ROOT ];
		}
		var loadData = [];
		for (var i = 0; mode != NONE && i < groups.length; i++) {
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
				return !task.isGroup() && !task.isArchived();
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
	}

	bus.listen("gantt-created", refresh);

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Mostrar dedicación grupos").on("click", function() {
		mode = (mode + 1) % 3;
		refresh();
	});

	bus.listen("selection-update", function() {
		updateLoadSelection(d3.select("#level4").selectAll(".load"));
	});
});