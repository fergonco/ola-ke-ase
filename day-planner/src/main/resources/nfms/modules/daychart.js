define([ "message-bus", "task-tree", "utils", "time-interval-filter", "d3" ], function(bus, taskTree, utils, timeIntervalFilter) {

	var chartPlanned, chartUnplanned;
	var interval = [ utils.today.getTime(), utils.today.getTime() + utils.DAY_MILLIS ];
	var xScale, yScale;

	var getDayTaskNames = function() {
		var intervalFilter = timeIntervalFilter.createTimeIntervalFilter(function() {
			return interval;
		});
		var taskNames = taskTree.visitTasks(taskTree.ROOT, intervalFilter, taskTree.VISIT_ALL_CHILDREN, taskTree.NAME_EXTRACTOR);
		return taskNames;
	}

	var refreshBoth = function() {
		chartPlanned.refresh();
		chartUnplanned.refresh();
	}

	var toHour = function(date) {
		return date.getUTCHours() + date.getMinutes() / 60;
	}

	var updateTask = function(taskSelection) {
		taskSelection//
		.attr("x", function(d) {
			var task = taskTree.getTask(d);
			if (task.isPlannedInDay()) {
				return xScale(5);
			} else {
				return xScale(55);
			}
		})//
		.attr("width", function(d) {
			return xScale(40);
		})//
		.attr("y", function(d, i) {
			var task = taskTree.getTask(d);
			return yScale(task.getDayStart());
		})//
		.attr("height", function(d) {
			var task = taskTree.getTask(d);
			return yScale(task.getDayEnd()) - yScale(task.getDayStart());
		}).classed("finished", function(d) {
			var task = taskTree.getTask(d);
			return task.isDayFinished(interval[0]);
		});
	}

	var updateText = function(taskTextSelection) {
		taskTextSelection.style("font-size", "11px")//
		.attr("x", function(d) {
			var task = taskTree.getTask(d);
			if (task.isPlannedInDay()) {
				return xScale(8);
			} else {
				return xScale(58);
			}
		})//
		.attr("y", function(d) {
			var task = taskTree.getTask(d);
			return yScale(task.getDayStart()) + 15;
		}) //
		.html(function(d) {
			var ret = d;
			var timeSum = taskTree.getTask(d).getTimeRecordSum();
			if (timeSum > 0) {
				ret += ": " + utils.formatTime(timeSum);
			}
			return ret;
		}).classed("finished", function(d) {
			var task = taskTree.getTask(d);
			return task.isDayFinished(interval[0]);
		});
	}

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Guardar").on("click", function() {
		bus.send("save");
	});

	var chart = function(classPrefix, taskSelection, width, height, xSplit) {
		var filter = taskSelection;
		var taskClass = "task-" + classPrefix;
		var taskTextClass = "task-text-" + classPrefix;

		var refreshTask = function(taskName) {
			updateTask(d3.selectAll("." + taskClass).filter(function(d) {
				return d == taskName;
			}));
			updateText(d3.selectAll("." + taskTextClass).filter(function(d) {
				return d == taskName;
			}));
		}

		var refresh = function() {
			xScale = d3.scale.linear().domain([ 0, 100 ]).range([ 0, width ]);
			yScale = d3.scale.linear().domain([ 0, 24 ]).range([ 0, height ]);
			bus.send("new-scales", [ xScale, yScale ]);
			var yAxis = d3.svg.axis().scale(yScale).orient("left").tickSize(1);
			d3.select(".y").call(yAxis).selectAll("text")//
			.attr("dy", "1.5em");

			var hours = [ 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22 ];
			var hoursSelection = svg.selectAll(".hours").data(hours).enter()//
			.append("rect")//
			.attr("class", "hours")//
			.attr("x", function(d) {
				return xScale(0);
			})//
			.attr("y", function(d) {
				return yScale(d);
			})//
			.attr("width", function(d) {
				return xScale(100);
			})//
			.attr("height", function(d) {
				return yScale(1) - yScale(0);
			});

			// Data preparation
			var dayTaskNames = getDayTaskNames();
			var taskNames = dayTaskNames.filter(filter);

			// Task rects
			var taskSelection = svg.selectAll("." + taskClass).data(taskNames);
			taskSelection.exit().remove();
			taskSelection.enter().append("rect").attr("class", "task " + taskClass);
			updateTask(taskSelection);

			// Task texts
			var taskTextSelection = svg.selectAll("." + taskTextClass).data(taskNames);
			taskTextSelection.exit().remove();
			taskTextSelection.enter().append("text").attr("class", taskTextClass);
			updateText(taskTextSelection);

			// d&d
			var dy;
			var sourceY;
			var setter = null;
			var drag = d3.behavior.drag().on("dragstart", function(d) {
				var task = taskTree.getTask(d);
				dy = 0;
				sourceY = yScale(task.getDayStart());
				setter = function(value) {
					if (value >= 0 && value + task.getDayEnd() - task.getDayStart() <= 24) {
						task.setDayEnd(value + task.getDayEnd() - task.getDayStart());
						task.setDayStart(value);
					}
				};
				if (d3.event.sourceEvent.shiftKey) {
					var mouseY = d3.mouse(this)[1];
					var startDistance = Math.abs(mouseY - yScale(task.getDayStart()));
					var endDistance = Math.abs(mouseY - yScale(task.getDayEnd()));
					if (startDistance < endDistance) {
						setter = function(value) {
							if (value < task.getDayEnd()) {
								task.setDayStart(value);
							}
						};
					} else {
						sourceY = yScale(task.getDayEnd());
						setter = function(value) {
							if (value > task.getDayStart()) {
								task.setDayEnd(value);
							}
						};
					}
				}
			}).on("drag", function(d) {
				var task = taskTree.getTask(d);

				dy += d3.event.dy;

				var newTime = yScale.invert(sourceY + dy);
				if (!d3.event.sourceEvent.ctrlKey) {
					newTime = 0.25 * Math.floor(newTime / 0.25);
				}
				setter(newTime);

				var inPlanned = d3.mouse(this)[0] < xSplit;
				if (task.isPlannedInDay() != inPlanned) {
					task.setPlannedInDay(inPlanned);
					refreshBoth();
				} else {
					updateTask(d3.selectAll(".task").filter(function(d2) {
						return d2 == d;
					}));
					updateText(d3.selectAll("." + taskTextClass).filter(function(d2) {
						return d2 == d;
					}));
				}
			}).on("dragend", function(d) {
				refresh();
			});
			taskSelection.call(drag);
			taskTextSelection.call(drag);

			bus.send("day-planned", [ dayTaskNames, interval[0] ]);
		};

		return {
			"refresh" : refresh,
			"refreshTask" : refreshTask
		}
	}

	var width = 1000;
	var height = 800;
	d3.select("body").append("div").attr("class", "allscreen");
	var svg = d3.select(".allscreen").append("svg")//
	.attr("class", "chart")//
	.attr("width", width)//
	.attr("height", height)//
	.attr("transform", "translate(20, 20)");

	svg.append("g").attr("class", "y axis");

	chartPlanned = chart("left", function(taskName) {
		var task = taskTree.getTask(taskName);
		return task.isPlannedInDay();
	}, width, height, width / 2);
	chartUnplanned = chart("right", function(taskName) {
		var task = taskTree.getTask(taskName);
		return !task.isPlannedInDay();
	}, width, height, width / 2);

	bus.listen("data-ready", function() {
		refreshBoth();
	});

	bus.listen("refresh-task", function(e, taskName) {
		chartPlanned.refreshTask(taskName);
		chartUnplanned.refreshTask(taskName);
	});

	bus.listen("day+", function() {
		interval[0] += utils.DAY_MILLIS;
		interval[1] += utils.DAY_MILLIS;
		bus.send("refresh-tree");
	});

	bus.listen("day-", function() {
		interval[0] -= utils.DAY_MILLIS;
		interval[1] -= utils.DAY_MILLIS;
		bus.send("refresh-tree");
	});
});