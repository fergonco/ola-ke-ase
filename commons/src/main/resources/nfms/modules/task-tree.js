define([ "message-bus", "utils", "d3" ], function(bus, utils) {

	var nameIndicesMap = {};
	var timeDomain = null;
	var userFilter = null;
	var userChildrenFilter = null;
	var pan = 0;
	var scaleType = "week";
	var scaleUnit = utils.DAY_MILLIS;
	var xScale;
	var yScale;
	var taskNames;
	var statusList;

	var ROOT = {
		"taskName" : "root",
		"tasks" : null
	}

	var FILTER_ALL = function(task) {
		return task != ROOT;
	};
	var FILTER_NONE = function(task) {
		return false;
	};
	var FILTER_SINGLE_TASKS = function(task) {
		return !task.isGroup();
	};

	var FILTER_WITH_DATE = function(task) {
		return !task.isGroup();
	};

	var VISIT_ALL_CHILDREN = function(task) {
		return true;
	};

	var VISIT_ALL_GROUPS = function(task) {
		return task.isGroup();
	};

	var VISIT_UNFOLDED_CHILDREN = function(task) {
		return !task.hasOwnProperty("folded") || !task.folded;
	};

	var NAME_EXTRACTOR = function(task) {
		return task.taskName;
	};

	var visitTasks = function(task, filter, visitChildren, extractor) {
		return visitTasksWithIndex(null, task, [], filter, visitChildren, extractor);
	}

	var visitTasksWithIndex = function(parent, task, index, filter, visitChildren, extractor) {
		var ret = [];
		if (filter(task) && (userFilter == null || userFilter(task))) {
			ret = ret.concat(extractor(task, index, parent));
		}
		if (task.hasOwnProperty("tasks") && visitChildren(task)) {
			for (var i = 0; i < task.tasks.length; i++) {
				ret = ret.concat(visitTasksWithIndex(task, task.tasks[i], index.concat([ i ]),
						filter, visitChildren, extractor));
			}
		}

		return ret;
	}

	var getTask = function(taskName) {
		var taskIndices = nameIndicesMap[taskName];
		var ret = ROOT;
		for (var i = 0; i < taskIndices.length; i++) {
			ret = ret.tasks[taskIndices[i]];
		}
		return ret;
	};

	var validName = function(name) {
		for (var i = 0; i < taskNames.length; i++) {
			if (taskNames[i] == name) {
				return false;
			}
		}

		return true;
	}

	var getNewName = function() {
		var base = "new task";
		var name = base;
		var counter = 0;
		while (!validName(name)) {
			name = base + "-" + counter;
			counter++
		}

		return name;
	}

	var move = function(task, direction) {
		var tasks = task.getParent().tasks;
		for (var i = 0; i < tasks.length; i++) {
			if (tasks[i] == task) {
				tasks.splice(i, 1);
				var newPos = i - 1;
				if (direction == "down") {
					newPos = i + 1;
				}
				if (newPos < 0) {
					newPos = tasks.length;
				} else if (newPos > tasks.length) {
					newPos = 0;
				}
				tasks.splice(newPos, 0, task);
				break;
			}
		}
	}

	var getTaskIndex = function(tasks, task) {
		for (var i = 0; i < tasks.length; i++) {
			if (tasks[i] == task) {
				return i;
			}
		}

		return null;
	}

	var createChild = function(task, newTask) {
		if (!task.hasOwnProperty("tasks")) {
			task["tasks"] = [];
		}
		decorateTask(task, newTask);
		task.tasks.splice(0, 0, newTask);
		return newTask.taskName;
	}
	var decorateTask = function(parent, task) {
		task["getParent"] = function() {
			return parent;
		}
		task["isGroup"] = function() {
			return task.hasOwnProperty("tasks") && task.tasks.length > 0;
		}
		task["isFolded"] = function() {
			return task.hasOwnProperty("folded") && task.folded == true;
		}
		task["getStatus"] = function() {
			if (task.isGroup()) {
				return "gruppe";
			} else if (task.hasOwnProperty("status")) {
				return task.status;
			} else {
				return "short";
			}
		}
		task["getStartDate"] = function() {
			if (!task.isGroup()) {
				if (task.hasOwnProperty("startDate")) {
					return new Date(task["startDate"]);
				} else {
					return utils.today;
				}
			} else {
				return null;
			}
		};
		task["getEndDate"] = function() {
			if (!task.isGroup()) {
				if (task.hasOwnProperty("endDate")) {
					return new Date(task["endDate"]);
				} else {
					return new Date(utils.today.getTime() + utils.DAY_MILLIS);
				}
			} else {
				return null;
			}
		};
		task["createSibling"] = function(before) {
			var newTask = {
				taskName : getNewName()
			};
			var index = -1;
			var parentTask = task.getParent();
			for (var i = 0; i < parentTask.tasks.length; i++) {
				if (parentTask.tasks[i].taskName == task.taskName) {
					index = i;
					break;
				}
			}
			if (parentTask.tasks[index].hasOwnProperty("status")) {
				newTask["status"] = parentTask.tasks[index].status;
			}
			decorateTask(parentTask, newTask);
			if (!before) {
				index = index + 1;
			}
			parentTask.tasks.splice(index, 0, newTask);
			return newTask.taskName;
		}
		task["createChild"] = function() {
			var newTask = {
				taskName : getNewName()
			};
			if (task.hasOwnProperty("status")) {
				newTask["status"] = task.status;
			}
			if (task.getStartDate() != null) {
				newTask.startDate = task.getStartDate();
			}
			if (task.getEndDate() != null) {
				newTask.endDate = task.getEndDate();
			}
			return createChild(task, newTask);
		}
		task["removeChild"] = function(child) {
			if (task.isGroup()) {
				for (var i = 0; i < task.tasks.length; i++) {
					if (task.tasks[i] == child) {
						task.tasks.splice(i, 1);
						break;
					}
				}
			}
		}
		task["setTaskName"] = function(name) {
			if (validName(name)) {
				task.taskName = name;
				return true;
			} else {
				return name == task.taskName;
			}
		}
		task["moveUp"] = function() {
			move(task, "up");
		}
		task["moveDown"] = function() {
			move(task, "down");
		}
		task["moveToParentLevel"] = function() {
			if (task.getParent() == null || task.getParent().getParent() == null) {
				return;
			}
			var taskIndex = getTaskIndex(task.getParent().tasks, task);
			var parentIndex = getTaskIndex(task.getParent().getParent().tasks, task.getParent());
			task.getParent().tasks.splice(taskIndex, 1);
			task.getParent().getParent().tasks.splice(parentIndex + 1, 0, task);
		}
		task["moveToNextBrother"] = function() {
			var tasks = task.getParent().tasks;
			var taskIndex = getTaskIndex(tasks, task);
			var brotherIndex = taskIndex + 1;
			if (taskIndex == tasks.length - 1) {
				brotherIndex = taskIndex - 1;
			}
			createChild(tasks[brotherIndex], task);
			tasks.splice(taskIndex, 1);
		}
		task["startTimeRecord"] = function(time) {
			if (!task.hasOwnProperty("timeRecords")) {
				task["timeRecords"] = [];
			}
			task["timeRecords"].push({
				"start" : time
			});
		}
		task["stopTimeRecord"] = function(time) {
			if (task.hasOwnProperty("timeRecords")) {
				var last = task.timeRecords[task.timeRecords.length - 1];
				if (!last.hasOwnProperty("end")) {
					last["end"] = time;
				}
			}
		}
		task["hasOpenTimeRecord"] = function(time) {
			if (task.hasOwnProperty("timeRecords") && task.timeRecords.length > 0) {
				var last = task.timeRecords[task.timeRecords.length - 1];
				return !last.hasOwnProperty("end");
			}
			return false;
		}
		task["getTimeRecordSum"] = function(min, max) {
			if (!min) {
				min = 0;
			}
			if (!max) {
				max = Number.MAX_VALUE;
			}
			var acum = 0;
			if (task.hasOwnProperty("timeRecords")) {
				for (var i = 0; i < task.timeRecords.length; i++) {
					var record = task.timeRecords[i];
					var end;
					if (record.hasOwnProperty("end")) {
						end = Math.min(max, record.end);
					} else {
						end = new Date().getTime();
					}
					var start = Math.max(min, record.start);
					acum = acum + end - start;
				}
			}
			if (task.isGroup()) {
				for (var i = 0; i < task.tasks.length; i++) {
					acum += task.tasks[i].getTimeRecordSum();
				}

			}
			return acum;
		}
		task["getDailyDuration"] = function() {
			if (task.hasOwnProperty("dailyDuration")) {
				var ret = parseFloat(task["dailyDuration"]);
				if (ret > 0) {
					return ret;
				}
			}
			return task.isGroup() ? 0 : 5;
		}
		task["setDayFinished"] = function(finished, day) {
			var dayList;
			if (task.hasOwnProperty("dayFinished")) {
				dayList = task["dayFinished"];
			} else {
				dayList = [];
				task["dayFinished"] = dayList;
			}
			if (finished) {
				dayList.push(day);
			} else {
				var index = dayList.indexOf(day);
				if (index != -1) {
					dayList.splice(index, 1);
				}
			}
		}
		task["isDayFinished"] = function(day) {
			if (task.hasOwnProperty("dayFinished")) {
				var dayList = task["dayFinished"];
				return dayList.indexOf(day) != -1;
			}

			return false;
		}
		task["getContent"] = function() {
			if (task.hasOwnProperty("content")) {
				return task.content;
			} else {
				return "";
			}
		}
		task["getPresentationTimeDomain"] = function() {
			var ret;
			if (task.isGroup()) {
				var min = null;
				var max = null;
				for (var i = 0; i < task.tasks.length; i++) {
					var childTimeDomain = task.tasks[i].getPresentationTimeDomain();
					if (min == null || min > childTimeDomain[0]) {
						min = childTimeDomain[0];
					}
					if (max == null || max < childTimeDomain[1]) {
						max = childTimeDomain[1];
					}
				}
				ret = [ new Date(min.getTime() - utils.DAY_MILLIS / 3),
						new Date(max.getTime() + utils.DAY_MILLIS / 3) ];
			} else {
				ret = [ task.getStartDate(), task.getEndDate() ];
			}

			return ret;
		}

	}

	bus.listen("refresh-tree", function(e) {
		decorateTask(null, ROOT);
		visitTasks(ROOT, FILTER_ALL, VISIT_ALL_CHILDREN, function(task, index, parent) {
			decorateTask(parent, task);
		});
		timeDomain = ROOT.getPresentationTimeDomain();
		timeDomain = [ new Date(timeDomain[0].getTime() + pan),
				new Date(timeDomain[1].getTime() + pan) ];
		var childrenFilter = userChildrenFilter != null ? VISIT_ALL_CHILDREN
				: VISIT_UNFOLDED_CHILDREN;
		var taskFilter = userChildrenFilter != null ? FILTER_SINGLE_TASKS : FILTER_ALL;
		visitTasks(ROOT, FILTER_ALL, childrenFilter, function(task, index) {
			nameIndicesMap[task.taskName] = index;
		});
		taskNames = visitTasks(ROOT, taskFilter, childrenFilter, NAME_EXTRACTOR);

		var dayCount = (timeDomain[1].getTime() - timeDomain[0].getTime()) / utils.DAY_MILLIS;
		var daySize = scaleType == "week" ? 30 : 400;
		xScale = d3.time.scale().domain(timeDomain).range([ 0, daySize * dayCount ]).clamp(false);
		yScale = d3.scale.ordinal().domain(taskNames).rangeRoundBands([ 0, taskNames.length * 20 ],
				.1);
		statusList = [];
		visitTasks(ROOT, FILTER_ALL, VISIT_ALL_CHILDREN, function(task) {
			var taskStatus = task.getStatus();
			if (statusList.indexOf(taskStatus) == -1) {
				statusList.push(taskStatus);
			}
		});
		statusList.sort();
		bus.send("data-ready");
	});

	bus.listen("plan", function(e, plan) {
		ROOT.tasks = plan;
		bus.send("set-scale", [ "week" ]);
	});

	bus.listen("pan", function(e, millis) {
		pan += millis;
	});

	bus.listen("set-scale", function(e, type) {
		scaleType = type;
		scaleUnit = scaleType == "week" ? utils.DAY_MILLIS : 30 * 60 * 1000;
		bus.send("refresh-tree");
	});

	bus.listen("filter", function(e, newFilter) {
		userFilter = newFilter;
		if (userFilter != null) {
			userChildrenFilter = VISIT_ALL_CHILDREN;
		} else {
			userChildrenFilter = null;
		}
		bus.send("refresh-tree");
	});

	bus.listen("save", function() {
		bus.send("show-wait-mask", "Salvando...");
		bus.send("ajax", {
			type : 'POST',
			url : 'plan',
			contentType : "application/json",
			data : JSON.stringify(ROOT.tasks),
			success : function(data, textStatus, jqXHR) {
				bus.send("info", "Guardado");
			},
			errorMsg : "No se salvó",
			complete : function() {
				bus.send("hide-wait-mask");
			}
		});

	});

	return {
		"getTask" : getTask,
		"ROOT" : ROOT,
		"VISIT_ALL_CHILDREN" : VISIT_ALL_CHILDREN,
		"FILTER_ALL" : FILTER_ALL,
		"VISIT_UNFOLDED_CHILDREN" : VISIT_UNFOLDED_CHILDREN,
		"NAME_EXTRACTOR" : NAME_EXTRACTOR,
		"visitTasks" : visitTasks,
		"getTimeDomain" : function() {
			return timeDomain;
		},
		"getTaskNames" : function() {
			return taskNames;
		},
		"getXScale" : function() {
			return xScale;
		},
		"getYScale" : function() {
			return yScale;
		},
		"getStatusList" : function() {
			return statusList;
		},
		"getScaleType" : function() {
			return scaleType;
		},
		"getScaleUnit" : function() {
			return scaleUnit;
		}
	}
});
