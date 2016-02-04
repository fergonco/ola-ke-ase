define([ "utils", "message-bus", "task-tree", "d3" ], function(utils, bus, taskTree) {
	var margin;
	var height;
	var width;
	var svg;
	var level1, level2, level3, level4;

	var timeDomain;
	var taskNames;
	var xScale;
	var yScale;
	var statusList;

	var styleFunction = null;

	var getWeekends = function(timeDomain) {
		var ret = [];
		var startDate = new Date(timeDomain[0]);
		startDate.setUTCHours(0);
		startDate.setUTCMinutes(0);
		startDate.setUTCSeconds(0);
		startDate.setUTCMilliseconds(0);
		var daysUntilSaturday = 6 - startDate.getUTCDay();
		var firstSaturday = new Date(startDate.getTime() + daysUntilSaturday * utils.DAY_MILLIS);
		while (firstSaturday < timeDomain[1]) {
			ret.push(firstSaturday);
			firstSaturday = new Date(firstSaturday.getTime() + 7 * utils.DAY_MILLIS);
		}

		return ret;
	};

	margin = {
		top : 30,
		right : 40,
		bottom : 20,
		left : 450
	};
	height = 1200;// document.body.clientHeight - margin.top -
	// margin.bottom- 5;
	width = 1200;// document.body.clientWidth - margin.right - margin.left -
	// 5;

	d3.select("body").append("div").attr("class", "allscreen");
	svg = d3.select(".allscreen").append("svg")//
	.attr("class", "chart")//
	.attr("width", width + margin.left + margin.right)//
	.attr("height", height + margin.top + margin.bottom)//
	.append("g")//
	.attr("class", "gantt-chart")//
	.attr("width", width + margin.left + margin.right)//
	.attr("height", height + margin.top + margin.bottom)//
	.attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
	svg.append("defs").append("clipPath")//
	.attr("id", "clipper")//
	.append("path");

	level1 = svg.append("g").attr("id", "level1").style("clip-path", "url(#clipper)");
	level2 = svg.append("g").attr("id", "level2").style("clip-path", "url(#clipper)");
	level3 = svg.append("g").attr("id", "level3").style("clip-path", "url(#clipper)");
	level4 = svg.append("g").attr("id", "level4").style("clip-path", "url(#clipper)");

	var updateTask = function(selection) {
		selection//
		.attr("title", function(d) {
			return d;
		})//
		.attr("style", function(d) {
			var task = taskTree.getTask(d);
			var style = "";
			if (task.isGroup()) {
				if (task.isFolded()) {
					style = "fill: #000000";
				} else {
					style = "fill: #eeeeee; stroke: #000000; stroke-width: 1px;";
				}
			} else if (styleFunction != null) {
				style = styleFunction(d);
			} else {
				style = "fill: #669900";
			}
			return style;
		}) //
		.attr("class", "tasks") //
		.attr("y", 0)//
		.attr("transform", function(d) {
			var dates = taskTree.getTask(d).getPresentationTimeDomain();
			return "translate(" + xScale(dates[0]) + "," + yScale(d) + ")";
		})//
		.attr("height", function(d) {
			return yScale.rangeBand();
		})//
		.attr("width", function(d) {
			var task = taskTree.getTask(d);
			var dates = task.getPresentationTimeDomain();
			return (xScale(dates[1]) - xScale(dates[0]));
		}).on("click", function(d) {
			if (d3.event.defaultPrevented)
				return; // click suppressed
			var task = taskTree.getTask(d);
			bus.send("select-task", [ d ]);
			if (task.isGroup()) {
				bus.send("toggle-folded-selected");
			}
			if (d3.event.ctrlKey && !task.isGroup()) {
				var statusList = taskTree.getStatusList();
				var taskStatus = task.getStatus();
				for (var i = 0; i < statusList.length; i++) {
					if (taskStatus == statusList[i]) {
						task.status = statusList[(i + 1) % statusList.length];
						updateTask(d3.select(this));
						break;
					}
				}
			}
		});
	};

	var updateTaskHandlers = function(selection) {
		var handleWidth = 5;
		selection//
		.attr("class", "taskdates") //
		.attr("y", 0)//
		.attr("transform", function(d) {
			var task = taskTree.getTask(d.taskName);
			var dates = task.getPresentationTimeDomain();
			var x = xScale(dates[d.dateIndex]);
			if (d.dateIndex != 1) {
				x -= handleWidth;
			}
			return "translate(" + x + "," + yScale(d.taskName) + ")";
		})//
		.attr("height", function(d) {
			return yScale.rangeBand();
		})//
		.attr("width", handleWidth);
	}

	bus.listen("data-ready", function() {
		timeDomain = taskTree.getTimeDomain();
		taskNames = taskTree.getTaskNames();
		xScale = taskTree.getXScale();
		yScale = taskTree.getYScale();
		var yRange = yScale.range();
		height = (yRange[1] - yRange[0] + 1) * (1 + taskNames.length) + 30;
		d3.select(".chart").attr("height", height);
		d3.select(".chart g").attr("height", height);
		d3.select("#clipper path")//
		.attr("d", "M 0 0 L " + width + " 0 L " + width + " " + height + " L 0 " + height + " Z");

		// Weekends
		var dayX = function(d) {
			return xScale(d);
		};
		var dayHeight = function(d) {
			return height - margin.top - margin.bottom;
		};
		var saturdays = getWeekends(timeDomain);
		var weekendSelection = level1.selectAll(".weekend").data(saturdays);
		weekendSelection.exit().remove();
		weekendSelection.enter().insert("rect", ":first-child");
		weekendSelection.attr("class", "weekend").attr("x", dayX).attr("y", 0).attr("width", function(d) {
			return xScale(new Date(d.getTime() + 2 * utils.DAY_MILLIS)) - xScale(d);
		}).attr("height", dayHeight);
		var dx;
		var drag = d3.behavior.drag().on("dragstart", function(d) {
			dx = 0;
		}).on("drag", function(d) {
			dx = d3.event.dx;
			if (dx != 0) {
				var pannedMillis = xScale.invert(0).getTime() - xScale.invert(dx).getTime();
				bus.send("pan", [ pannedMillis ]);
				bus.send("refresh-tree");
			}
		});
		weekendSelection.call(drag);

		// Tasks
		var taskSelection = level3.selectAll(".tasks").data(taskNames);
		taskSelection.exit().remove();
		taskSelection.enter().append("rect");

		updateTask(taskSelection);

		// drag&drop tasks
		var sourceX;
		drag = d3.behavior.drag().on("dragstart", function(d) {
			var task = taskTree.getTask(d);
			dx = 0;
			sourceX = xScale(task.getStartDate());
		}).on("drag", function(d) {
			dx += d3.event.dx;
			var task = taskTree.getTask(d);
			var length = task.getEndDate().getTime() - task.getStartDate().getTime();
			var newStartDate = xScale.invert(sourceX + dx);
			var scaleUnit = taskTree.getScaleUnit();
			newStartDate = new Date((scaleUnit * Math.floor(newStartDate.getTime() / scaleUnit)));

			task.setStartDate(utils.formatDate(newStartDate));
			task.setEndDate(utils.formatDate(new Date(newStartDate.getTime() + length)));

			updateTask(d3.select(this));
			updateTaskHandlers(d3.selectAll(".taskdates").filter(function(d2) {
				return d2.taskName == d;
			}));
		}).on("dragend", function(d) {
			if (dx != 0) {
				bus.send("refresh-tree");
			}
		});
		taskSelection.call(drag);

		// Group markers
		var groupTaskNames = [];
		for (var i = 0; i < taskNames.length; i++) {
			var task = taskTree.getTask(taskNames[i]);
			if (task.isGroup() && !task.isFolded()) {
				groupTaskNames.push(taskNames[i]);
			}
		}
		var groupMarkerSelection = level3.selectAll(".groupMarker").data(groupTaskNames);
		groupMarkerSelection.exit().remove();
		groupMarkerSelection.enter().append("path");
		groupMarkerSelection//
		.attr("class", "groupMarker")//
		.attr("fill", "none")//
		.attr("stroke", "#000000")//
		.attr("stroke-width", "1")//
		.attr("d", function(d) {
			var task = taskTree.getTask(d);
			var dates = task.getPresentationTimeDomain();
			var x = xScale(dates[0]);
			var y1 = yScale(d);
			var t = task;
			while (t.isGroup() && !t.isFolded()) {
				t = t.tasks[t.tasks.length - 1];
			}
			var y2 = yScale(t.taskName) + yScale.rangeBand();
			return "M " + x + " " + y1 + " L " + x + " " + y2 + " L " + (x + 10) + " " + y2;
		});

		// Tasks date handlers
		var taskDates = [];
		for (var i = 0; i < taskNames.length; i++) {
			var task = taskTree.getTask(taskNames[i]);
			if (!task.isGroup()) {
				taskDates.push({
					"taskName" : taskNames[i],
					"dateIndex" : 0
				});
				taskDates.push({
					"taskName" : taskNames[i],
					"dateIndex" : 1
				});
			}
		}
		var taskHandlersSelection = level4.selectAll(".taskdates").data(taskDates);
		taskHandlersSelection.exit().remove();
		taskHandlersSelection.enter().append("rect");

		updateTaskHandlers(taskHandlersSelection);

		// drag&drop task date handlers
		drag = d3.behavior.drag().on("dragstart", function(d) {
			var task = taskTree.getTask(d.taskName);
			dx = 0;
			if (d.dateIndex == 0) {
				sourceX = xScale(task.getStartDate());
			} else {
				sourceX = xScale(task.getEndDate());
			}
		}).on("drag", function(d) {
			dx += d3.event.dx;
			var task = taskTree.getTask(d.taskName);
			var newDate = xScale.invert(sourceX + dx);
			var scaleUnit = taskTree.getScaleUnit();
			newDate = new Date((scaleUnit * Math.floor(newDate.getTime() / scaleUnit)));
			if (d.dateIndex == 0) {
				task.setStartDate(utils.formatDate(newDate));
			} else {
				task.setEndDate(utils.formatDate(newDate));
			}
			updateTaskHandlers(d3.select(this));
			updateTask(d3.selectAll(".tasks").filter(function(d2) {
				return d2 == d.taskName;
			}));
		}).on("dragend", function(d) {
			bus.send("refresh-tree");
		});
		taskHandlersSelection.call(drag);

		// Today
		var todaySelection = level2.selectAll(".today").data([ utils.today ]);
		todaySelection.exit().remove();
		todaySelection.enter().insert("rect", ":first-child");
		todaySelection.attr("class", "today").attr("x", dayX).attr("y", 0).attr("width", function(d) {
			return xScale(new Date(d.getTime() + utils.DAY_MILLIS)) - xScale(d);
		}).attr("height", dayHeight);

		// Hours
		var hours = [ 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22 ];
		var hoursSelection = level2.selectAll(".todayHours").data(hours);
		hoursSelection.exit().remove();
		hoursSelection.enter().insert("rect", ":first-child");
		hoursSelection.attr("class", function(d) {
			return "todayHours hour-" + d;
		}).attr("x", function(d) {
			return xScale(new Date(utils.today.getTime() + (d * 60 * 60 * 1000)));
		}).attr("y", 0).attr("width", function(d) {
			var date = new Date(utils.today.getTime() + (d * 60 * 60 * 1000));
			return xScale(new Date(date.getTime() + 1000 * 60 * 60)) - xScale(date);
		}).attr("height", height - margin.top - margin.bottom);

		// Axis
		svg.selectAll(".axis").remove();

		var yAxis = d3.svg.axis().scale(yScale).orient("left").tickSize(1);
		svg.append("g").attr("class", "y axis").call(yAxis);

		var each = 2 * utils.DAY_MILLIS;
		if (taskTree.getScaleType() == "month") {
			each = 7 * utils.DAY_MILLIS;
		}
		var tickCount = Math.round((timeDomain[1].getTime() - timeDomain[0].getTime()) / each);
		var xAxis1 = d3.svg.axis().scale(xScale).tickSize(1).tickPadding(8).ticks(tickCount);
		var gXBottom = svg.append("g")//
		.attr("class", "x axis")//
		.attr("transform", "translate(0, " + (height - margin.top - margin.bottom) + ")")//
		.style("font-size", "10px");
		var gXTop = svg.append("g")//
		.style("font-size", "10px")//
		.attr("class", "x axis");

		if (taskTree.getScaleType() == "day") {
			var hourTicks = [];
			for (var i = 0; i < hours.length; i++) {
				hourTicks.push(new Date(utils.today.getTime() + (hours[i] * 60 * 60 * 1000)));
			}
			xAxis1.tickValues(hourTicks).tickFormat(d3.time.format("%H:%M"));
			xAxis1.orient("top");
			gXTop.call(xAxis1).selectAll("text")//
			.style("text-anchor", "start")//
			.attr("dx", ".2em")//
			.attr("dy", ".3em")//
			.attr("transform", "rotate(-25)");
			xAxis1.orient("bottom");
			gXBottom.call(xAxis1).selectAll("text")//
			.style("text-anchor", "end")//
			.attr("dx", ".2em")//
			.attr("dy", ".3em")//
			.attr("transform", "rotate(-25)");
		} else {
			xAxis1.tickFormat(d3.time.format("%d/%m"));
			xAxis1.orient("top");
			gXTop.call(xAxis1).selectAll("text").attr("dx", "15px");
			xAxis1.orient("bottom");
			gXBottom.call(xAxis1);
		}

		var zoom = d3.behavior.zoom();
		svg.call(zoom);

		bus.send("gantt-created", [ svg ]);
	});

	bus.listen("refresh-task", function(e, taskName) {
		var task = taskTree.getTask(taskName);
		updateTask(d3.selectAll(".task").filter(function(d) {
			return d == taskName;
		}));
	});
	
	bus.listen("set-task-styler", function(e, newStyleFunction){
		styleFunction = newStyleFunction;
		bus.send("refresh-tree");
	});

});