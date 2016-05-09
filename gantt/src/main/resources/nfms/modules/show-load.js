define([ "utils", "message-bus", "task-tree", "d3" ], function(utils, bus, taskTree) {

	var NONE = 0, ROOT = 1, GROUPS = 2;

	var mode = 0;
	var xScale;
	var yScale;

	var width;

	var minimumStart = null;
	var maximumEnd = null;

	function getTimeDomain(task) {
		var ret = task.getTimeDomain(0, false);
		if (ret == null) {
			return [ minimumStart, maximumEnd ];
		} else {
			return [ Math.max(ret[0].getTime(), minimumStart), Math.min(ret[1].getTime(), maximumEnd) ];
		}
	}

	function getStartMillis(task) {
		var ret = task.getStartDate();
		ret = Math.max(ret.getTime(), minimumStart);

		return ret;
	}

	function getEndMillis(task) {
		var ret = task.getEndDate();
		ret = Math.min(ret.getTime(), maximumEnd);

		return ret;
	}

	function getTreeTimeDomain() {
		var ret = taskTree.getTimeDomain();
		return [ Math.max(ret[0].getTime(), minimumStart), Math.min(ret[1].getTime(), maximumEnd) ];
	}

	function updateLoadSelection(loadSelection) {
		var container = d3.select(".allscreen").node();
		var timeDomain = getTreeTimeDomain();
		var xScale = taskTree.getXScale();
		var yScale = taskTree.getYScale();
		var dayWidthPixels = xScale(new Date(timeDomain[0] + utils.DAY_MILLIS)) - xScale(timeDomain[0]);
		loadSelection.attr("class", "load")//
		.attr("x", function(d, index) {
			var task;
			if (d.groupName == taskTree.ROOT.getTaskName()) {
				task = taskTree.ROOT;
			} else {
				task = taskTree.getTask(d.groupName);
			}
			var taskTimeDomain = getTimeDomain(task);
			return xScale(taskTimeDomain[0] + d.groupIndex * utils.DAY_MILLIS);
		})//
		.attr("y", function(d) {
			if (d.groupName == taskTree.ROOT.getTaskName()) {
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
			if (d.groupName == taskTree.ROOT.getTaskName()) {
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
		});
		loadSelection.selectAll("title").remove();
		loadSelection.append("title").text(function(d, index) {
			return d.label + ":" + d.load + "h (" + new Date(timeDomain[0] + index * utils.DAY_MILLIS) + ")";
		});
	}

	function refresh() {
		var xScale = taskTree.getXScale();
		minimumStart = xScale.invert(0).getTime();
		maximumEnd = xScale.invert(width).getTime();

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
			var groupTimeDomain = getTimeDomain(groups[i]);
			var dayCount = Math.ceil((groupTimeDomain[1] - groupTimeDomain[0]) / utils.DAY_MILLIS);
			for (var j = 0; j < dayCount; j++) {
				groupLoadData.push({
					groupName : groups[i].getTaskName(),
					groupIndex : j,
					label : groups[i].getLabel(),
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
				var start = Math.round(getStartMillis(task) / utils.DAY_MILLIS) * utils.DAY_MILLIS;
				var end = getEndMillis(task);
				for (var day = start; day < end; day = day + utils.DAY_MILLIS) {
					var index = Math.floor((day - groupTimeDomain[0]) / utils.DAY_MILLIS);
					groupLoadData[index]["load"] += task.getDayDuration(day);
				}
			}

			loadData = loadData.concat(groupLoadData);
		}

		var loadSelection = d3.select("#level4").selectAll(".load").data(loadData);
		loadSelection.exit().remove();
		loadSelection.enter().append("rect");
		updateLoadSelection(loadSelection);
	}

	bus.listen("gantt-created", function(e, svg, newWidth, height) {
		width = newWidth;
		refresh();
	});

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