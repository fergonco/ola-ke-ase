define([ "message-bus", "utils", "d3" ], function(bus, utils) {

	var nameIndicesMap = {};
	var timeDomain = null;
	var showArchived = false;
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
		"tasks" : null,
		"dedicationUpperLimit" : 10
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

	var visitAllTasks = function(extractor) {
		return visitTasksWithIndex(null, ROOT, [], function() {
			return true;
		}, function() {
			return true;
		}, extractor, true);
	}

	var visitTasks = function(task, filter, visitChildren, extractor) {
		return visitTasksWithIndex(null, task, [], filter, visitChildren, extractor, false);
	}

	var visitTasksIgnoreUserFilter = function(task, filter, visitChildren, extractor) {
		return visitTasksWithIndex(null, task, [], filter, visitChildren, extractor, true);
	}

	var visitTasksWithIndex = function(parent, task, index, filter, visitChildren, extractor, overrideFilter) {
		var ret = [];
		var archivedFilter = showArchived || (!task.hasOwnProperty("archived") || !task["archived"]);
		if (filter(task) && (overrideFilter || (archivedFilter && (userFilter == null || userFilter(task))))) {
			ret = ret.concat(extractor(task, index, parent));
		}
		if (task.hasOwnProperty("tasks") && visitChildren(task)) {
			for (var i = 0; i < task.tasks.length; i++) {
				ret = ret.concat(visitTasksWithIndex(task, task.tasks[i], index.concat([ i ]), filter, visitChildren, extractor,
						overrideFilter));
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
	function getter(task, propertyName, defaultValue) {
		if (task.hasOwnProperty(propertyName)) {
			return task[propertyName];
		} else {
			return defaultValue;
		}
	}
	function setter(task, propertyName, value) {
		task[propertyName] = value;
		bus.send("dirty");
	}
	function decorateTask(parent, task) {
		task["getParent"] = function() {
			return parent;
		}
		task["isGroup"] = function() {
			return task.hasOwnProperty("tasks") && task.tasks.length > 0;
		}
		task["isFolded"] = function() {
			return task.hasOwnProperty("folded") && task.folded == true;
		}
		task["setFolded"] = function(foldedStatus) {
			setter(task, "folded", foldedStatus);
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
		task["setStartDate"] = function(newStartDate) {
			task["startDate"] = newStartDate;
			bus.send("dirty");
		}
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
		task["setEndDate"] = function(newEndDate) {
			task["endDate"] = newEndDate;
			bus.send("dirty");
		}
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
			bus.send("dirty");
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
			var ret = createChild(task, newTask);
			bus.send("dirty");
			return ret;
		}
		task["removeChild"] = function(child) {
			if (task.isGroup()) {
				for (var i = 0; i < task.tasks.length; i++) {
					if (task.tasks[i] == child) {
						task.tasks.splice(i, 1);
						bus.send("dirty");
						break;
					}
				}
			}
		}
		task["getTaskName"] = function() {
			return task.taskName;
		}
		task["setTaskName"] = function(name) {
			if (validName(name)) {
				task.taskName = name;
				bus.send("dirty");
				return true;
			} else {
				return name == task.taskName;
			}
		}
		task["moveUp"] = function() {
			move(task, "up");
			bus.send("dirty");
		}
		task["moveDown"] = function() {
			move(task, "down");
			bus.send("dirty");
		}
		task["moveToParentLevel"] = function() {
			if (task.getParent() == null || task.getParent().getParent() == null) {
				return;
			}
			var taskIndex = getTaskIndex(task.getParent().tasks, task);
			var parentIndex = getTaskIndex(task.getParent().getParent().tasks, task.getParent());
			task.getParent().tasks.splice(taskIndex, 1);
			task.getParent().getParent().tasks.splice(parentIndex + 1, 0, task);
			bus.send("dirty");
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
			bus.send("dirty");
		}
		task["setTimeRecords"] = function(newTimeRecords) {
			task["timeRecords"] = newTimeRecords
			bus.send("dirty");
		}
		task["startTimeRecord"] = function(time) {
			if (!task.hasOwnProperty("timeRecords")) {
				task["timeRecords"] = [];
			}
			task["timeRecords"].push({
				"start" : time
			});
			bus.send("dirty");
		}
		task["stopTimeRecord"] = function(time) {
			if (task.hasOwnProperty("timeRecords")) {
				var last = task.timeRecords[task.timeRecords.length - 1];
				if (!last.hasOwnProperty("end")) {
					last["end"] = time;
				}
			}
			bus.send("dirty");
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
					if (end > start) {
						acum = acum + end - start;
					}
				}
			}
			if (task.isGroup()) {
				for (var i = 0; i < task.tasks.length; i++) {
					acum += task.tasks[i].getTimeRecordSum(min, max);
				}

			}
			return acum;
		}
		task["getEstimatedTime"] = function() {
			var acum = 0;
			if (!task.isGroup()) {
				var numDays = 0;
				var day = task.getStartDate().getTime();
				while (day < task.getEndDate().getTime()) {
					if (new Date(day).getUTCDay() > 0 && new Date(day).getUTCDay() < 6) {
						numDays++;
					}
					day += utils.DAY_MILLIS;
				}
				acum += numDays * task.getDailyDuration() * 60 * 60 * 1000;
			} else {
				for (var i = 0; i < task.tasks.length; i++) {
					acum += task.tasks[i].getEstimatedTime();
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
		task["setDailyDuration"] = function(newDailyDuration) {
			setter(task, "dailyDuration", newDailyDuration);
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
			bus.send("dirty");
		}
		task["isDayFinished"] = function(day) {
			if (task.hasOwnProperty("dayFinished")) {
				var dayList = task["dayFinished"];
				return dayList.indexOf(day) != -1;
			}

			return false;
		}
		task["getContent"] = function() {
			return getter(task, "content", "");
		}
		task["setContent"] = function(newContent) {
			setter(task, "content", newContent);
		}
		task["getPresentationTimeDomain"] = function() {
			return task.getTimeDomain(utils.DAY_MILLIS / 3);
		}
		task["getTimeDomain"] = function(groupMargin) {
			var ret;
			if (task.isGroup()) {
				var min = null;
				var max = null;
				for (var i = 0; i < task.tasks.length; i++) {
					var childTimeDomain = task.tasks[i].getTimeDomain(groupMargin);
					if (min == null || min > childTimeDomain[0]) {
						min = childTimeDomain[0];
					}
					if (max == null || max < childTimeDomain[1]) {
						max = childTimeDomain[1];
					}
				}
				ret = [ new Date(min.getTime() - groupMargin), new Date(max.getTime() + groupMargin) ];
			} else {
				ret = [ task.getStartDate(), task.getEndDate() ];
			}

			return ret;
		}
		task["isArchived"] = function() {
			return getter(task, "archived", false);
		}
		task["setArchived"] = function(archived) {
			setter(task, "archived", archived);
		}
		var toHour = function(date) {
			return date.getUTCHours() + date.getMinutes() / 60;
		}
		task["getDayStart"] = function() {
			if (task.hasOwnProperty("dayStart")) {
				return task.dayStart;
			} else {
				var taskLength = task.getEndDate().getTime() - task.getStartDate().getTime();
				if (taskLength != utils.DAY_MILLIS) {
					return toHour(task.getStartDate());
				} else {
					return task.getTaskName().length % 20;
				}
			}
		}
		task["setDayStart"] = function(dayStart) {
			setter(task, "dayStart", dayStart);
		}
		task["getDayEnd"] = function() {
			if (task.hasOwnProperty("dayEnd")) {
				return task.dayEnd;
			} else {
				var taskLength = task.getEndDate().getTime() - task.getStartDate().getTime();
				if (taskLength != utils.DAY_MILLIS) {
					return toHour(task.getEndDate());
				} else {
					return task.getDayStart() + task.getDailyDuration();
				}
			}
		}
		task["setDayEnd"] = function(dayEnd) {
			setter(task, "dayEnd", dayEnd);
		}
		task["isPlannedInDay"] = function() {
			if (task.hasOwnProperty("plannedInDay")) {
				return task.plannedInDay;
			} else {
				if (!task.hasOwnProperty("dayStart")) {
					var taskLength = task.getEndDate().getTime() - task.getStartDate().getTime();
					if (taskLength != utils.DAY_MILLIS) {
						return true;
					} else {
						return false;
					}
				} else {
					return true;
				}
			}
		}
		task["setPlannedInDay"] = function(planned) {
			setter(task, "plannedInDay", planned);
		}
		task["getImportance"] = function() {
			return getter(task, "importance", 0);
		}
		task["setImportance"] = function(importance) {
			setter(task, "importance", importance);
		}
		task["getDedicationLowerLimit"] = function() {
			return getter(task, "dedicationLowerLimit", null);
		}
		task["getDedicationUpperLimit"] = function() {
			return getter(task, "dedicationUpperLimit", null);
		}
		task["setDedicationLowerLimit"] = function(limit) {
			setter(task, "dedicationLowerLimit", limit);
		}
		task["setDedicationUpperLimit"] = function(limit) {
			setter(task, "dedicationUpperLimit", limit);
		}
	}

	bus.listen("refresh-tree", function(e) {
		decorateTask(null, ROOT);
		visitAllTasks(function(task, index, parent) {
			decorateTask(parent, task);
		});
		timeDomain = ROOT.getPresentationTimeDomain();
		timeDomain[0] = new Date(utils.today.getTime() - 2 * utils.DAY_MILLIS);
		timeDomain = [ new Date(timeDomain[0].getTime() + pan), new Date(timeDomain[1].getTime() + pan) ];
		var childrenFilter = userChildrenFilter != null ? VISIT_ALL_CHILDREN : VISIT_UNFOLDED_CHILDREN;
		var taskFilter = userChildrenFilter != null ? FILTER_SINGLE_TASKS : FILTER_ALL;
		visitTasks(ROOT, FILTER_ALL, VISIT_ALL_CHILDREN, function(task, index) {
			nameIndicesMap[task.taskName] = index;
		});
		taskNames = visitTasks(ROOT, taskFilter, childrenFilter, NAME_EXTRACTOR);

		var dayCount = (timeDomain[1].getTime() - timeDomain[0].getTime()) / utils.DAY_MILLIS;
		var daySize = scaleType == "month" ? 8 : scaleType == "week" ? 30 : 400;
		xScale = d3.time.scale().domain(timeDomain).range([ 0, daySize * dayCount ]).clamp(false);
		yScale = d3.scale.ordinal().domain(taskNames).rangeRoundBands([ 0, taskNames.length * 20 ], .1);
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
		if (scaleType == "day") {
			scaleUnit = 30 * 60 * 1000;
		} else {
			scaleUnit = utils.DAY_MILLIS;
		}
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

	bus.listen("show-archived", function(e, newShowArchived) {
		showArchived = newShowArchived;
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
				bus.send("websocket-send-json", {
					"type" : "saved"
				});
				bus.send("saved");
			},
			errorMsg : "No se salvó",
			complete : function() {
				bus.send("hide-wait-mask");
			}
		});
	});

	bus.listen("websocket-receive", function(e, data) {
		if (data["type"] == "saved") {
			require([ "text!plan?a=" + new Date().getTime() ], function(newPlan) {
				ROOT.tasks = JSON.parse(newPlan);
				bus.send("refresh-tree");
			});
		}
	});

	return {
		"getTask" : getTask,
		"ROOT" : ROOT,
		"VISIT_ALL_CHILDREN" : VISIT_ALL_CHILDREN,
		"FILTER_ALL" : FILTER_ALL,
		"VISIT_UNFOLDED_CHILDREN" : VISIT_UNFOLDED_CHILDREN,
		"NAME_EXTRACTOR" : NAME_EXTRACTOR,
		"visitTasks" : visitTasks,
		"visitTasksIgnoreUserFilter" : visitTasksIgnoreUserFilter,
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
