define([ "message-bus", "task-tree", "utils", "d3" ], function(bus, taskTree, utils) {

	var interval = [ utils.today.getTime(), utils.today.getTime() + utils.DAY_MILLIS ];
	var filterActivated = false;
	var xScale, yScale;

	var toHour = function(date) {
		return date.getUTCHours() + date.getMinutes() / 60;
	}

	var updateTask = function(taskSelection) {
		taskSelection.attr("class", "task")//
		.attr("x", function(d) {
			return xScale(10);
		})//
		.attr("width", function(d) {
			return xScale(80);
		})//
		.attr("y", function(d, i) {
			var task = taskTree.getTask(d);
			return yScale(task.dayStart);
		})//
		.attr("height", function(d) {
			var task = taskTree.getTask(d);
			return yScale(task.dayEnd) - yScale(task.dayStart);
		});
	}

	var updateText = function(taskTextSelection) {
		taskTextSelection.attr("class", "task-text")//
		.attr("x", xScale(12))//
		.attr("y", function(d) {
			var task = taskTree.getTask(d);
			return yScale(task.dayStart + 0.4);
		}) //
		.html(function(d) {
			return d;
		});
	}

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Guardar").on("click", function() {
		bus.send("save");
	});

	var width = 1200;
	var height = 1000;
	d3.select("body").append("div").attr("class", "allscreen");
	var svg = d3.select(".allscreen").append("svg")//
	.attr("class", "chart")//
	.attr("width", width)//
	.attr("height", height);

	var refreshChart = function() {
		xScale = d3.scale.linear().domain([ 0, 100 ]).range([ 50, width - 50 ]);
		yScale = d3.scale.linear().domain([ 0, 24 ]).range([ 0, height ]);

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
		var taskNames = taskTree.getTaskNames();
		for (var i = 0; i < taskNames.length; i++) {
			var task = taskTree.getTask(taskNames[i]);
			if (!task.hasOwnProperty("dayStart")) {
				var taskLength = task.getEndDate().getTime() - task.getStartDate().getTime();
				if (taskLength != utils.DAY_MILLIS) {
					task["dayStart"] = toHour(task.getStartDate());
					task["dayEnd"] = toHour(task.getEndDate());
				} else {
					task["dayStart"] = i;
					task["dayEnd"] = i + 1;
				}
			}
		}

		// Task rects
		var taskSelection = svg.selectAll(".task").data(taskNames);
		taskSelection.exit().remove();
		taskSelection.enter().append("rect");
		updateTask(taskSelection);

		// Task texts
		var taskTextSelection = svg.selectAll(".task-text").data(taskNames);
		taskTextSelection.exit().remove();
		taskTextSelection.enter().append("text");
		updateText(taskTextSelection);

		// d&d
		var dy;
		var sourceY;
		var setter = null;
		var drag = d3.behavior.drag().on("dragstart", function(d) {
			var task = taskTree.getTask(d);
			dy = 0;
			sourceY = yScale(task.dayStart);
			setter = function(value) {
				task.dayEnd = value + task.dayEnd - task.dayStart;
				task.dayStart = value;
			};
			if (d3.event.sourceEvent.shiftKey) {
				var mouseY = d3.mouse(this)[1];
				var startDistance = Math.abs(mouseY - yScale(task.dayStart));
				var endDistance = Math.abs(mouseY - yScale(task.dayEnd));
				if (startDistance < endDistance) {
					setter = function(value) {
						task.dayStart = value;
					};
				} else {
					sourceY = yScale(task.dayEnd);
					setter = function(value) {
						task.dayEnd = value;
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

			updateTask(d3.selectAll(".task").filter(function(d2) {
				return d2 == d;
			}));
			updateText(d3.selectAll(".task-text").filter(function(d2) {
				return d2 == d;
			}));
		});
		taskSelection.call(drag);
		taskTextSelection.call(drag);

		var yAxis = d3.svg.axis().scale(yScale).orient("right").tickSize(1);
		svg.append("g").attr("class", "y axis").call(yAxis);

	};

	bus.listen("data-ready", function() {
		if (filterActivated) {
			refreshChart();
		} else {
			filterActivated = true;
			bus.send("activate-filter", interval);
		}
	});

	bus.listen("day+", function() {
		interval[0] += utils.DAY_MILLIS;
		interval[1] += utils.DAY_MILLIS;
		bus.send("activate-filter", interval);
	});
	bus.listen("day-", function() {
		interval[0] -= utils.DAY_MILLIS;
		interval[1] -= utils.DAY_MILLIS;
		bus.send("activate-filter", interval);
	});
});