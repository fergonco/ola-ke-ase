define([ "message-bus", "utils", "uid", "d3" ], function(bus, utils, uid) {

	var CURRENT_VERSION = 1;

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
		"id" : 0,
		"label" : "root",
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
		return task.getTaskName();
	};

	var decorateAllTasks = function(task, parent) {
		if (!task.hasOwnProperty("id") || !task.hasOwnProperty("label")) {
			task.label = task.taskName;
			task.id = uid();
			delete task["taskName"];
		}
		decorateTask(parent, task);
		if (task.hasOwnProperty("tasks")) {
			for (var i = 0; i < task.tasks.length; i++) {
				decorateAllTasks(task.tasks[i], task);
			}
		}
		if (task.hasOwnProperty("archivedTasks")) {
			for (var i = 0; i < task.archivedTasks.length; i++) {
				decorateAllTasks(task.archivedTasks[i], task);
			}
		}
	}

	var visitTasks = function(task, filter, visitChildren, extractor) {
		return visitTasksWithIndex(null, task, [], filter, visitChildren, extractor, false);
	}

	var visitTasksIgnoreUserFilter = function(task, filter, visitChildren, extractor) {
		return visitTasksWithIndex(null, task, [], filter, visitChildren, extractor, true);
	}

	var visitTasksWithIndex = function(parent, task, index, filter, visitChildren, extractor, overrideFilter) {
		var ret = [];
		if (filter(task) && (overrideFilter || userFilter == null || userFilter(task))) {
			ret = ret.concat(extractor(task, index, parent));
		}
		if (task.hasOwnProperty("tasks") && visitChildren(task)) {
			var children = task.getTasks()
			for (var i = 0; i < children.length; i++) {
				ret = ret.concat(visitTasksWithIndex(task, children[i], index.concat([ i ]), filter, visitChildren, extractor,
						overrideFilter));
			}
		}

		return ret;
	}

	var getTask = function(taskName) {
		var taskIndices = nameIndicesMap[taskName];
		var ret = ROOT;
		for (var i = 0; i < taskIndices.length; i++) {
			ret = ret.getTasks()[taskIndices[i]];
		}
		return ret;
	};

	var getNewName = function() {
		return "ola ke ase?";
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
		return newTask.getTaskName();
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
			return (task.hasOwnProperty("tasks") && task.tasks.length > 0)
					|| (task.hasOwnProperty("archivedTasks") && task.archivedTasks.length > 0);
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
				id : uid(),
				label : getNewName()
			};
			var index = -1;
			var parentTask = task.getParent();
			for (var i = 0; i < parentTask.tasks.length; i++) {
				if (parentTask.tasks[i].getTaskName() == task.getTaskName()) {
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
			return newTask.getTaskName();
		}
		task["createChild"] = function() {
			var newTask = {
				id : uid(),
				label : getNewName()
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
			return task.id;
		}
		task["getLabel"] = function() {
			return task.label;
		}
		task["setLabel"] = function(label) {
			task.label = label;
			bus.send("dirty");
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
				var children = task.getTasks(true);
				for (var i = 0; i < children.length; i++) {
					acum += children[i].getTimeRecordSum(min, max);
				}

			}
			return acum;
		}
		task["getEstimatedTime"] = function() {
			var acum = 0;
			if (!task.isGroup()) {
				var day = task.getStartDate().getTime();
				while (day < task.getEndDate().getTime()) {
					var dayDuration = task.getDayDuration(day) * 60 * 60 * 1000;
					acum += dayDuration;
					day += utils.DAY_MILLIS;
				}
			} else {
				var children = task.getTasks(true);
				for (var i = 0; i < children.length; i++) {
					acum += children[i].getEstimatedTime();
				}
			}

			return acum;
		}
		task["getDayDuration"] = function(millis) {
			if (task.hasOwnProperty("dailyDuration")) {
				var dailyDuration = task["dailyDuration"].toString();
				var components = dailyDuration.split(/[ ]+/);
				if (components.length == 1) {
					var duration = components[0];
					components = [ duration, duration, duration, duration, duration, duration, duration ];
				}
				var day = new Date(millis).getUTCDay();
				day = (day + 6) % 7;
				return parseFloat(components[day]);
			}
			return task.isGroup() ? 0 : 5;
		}
		task["getDailyDuration"] = function() {
			if (task.hasOwnProperty("dailyDuration")) {
				return task["dailyDuration"].toString();
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
			return task.getTimeDomain(utils.DAY_MILLIS / 3, showArchived);
		}
		task["getTimeDomain"] = function(groupMargin, showArchived) {
			var ret = null;
			if (task.isGroup()) {
				var min = null;
				var max = null;
				var children = task.getTasks(showArchived);
				for (var i = 0; i < children.length; i++) {
					var childTimeDomain = children[i].getTimeDomain(groupMargin, showArchived);
					if (childTimeDomain != null) {
						if (min == null || min > childTimeDomain[0]) {
							min = childTimeDomain[0];
						}
						if (max == null || max < childTimeDomain[1]) {
							max = childTimeDomain[1];
						}
					}
				}
				if (min != null && max != null) {
					ret = [ new Date(min.getTime() - groupMargin), new Date(max.getTime() + groupMargin) ];
				}
			} else {
				ret = [ task.getStartDate(), task.getEndDate() ];
			}

			return ret;
		}
		task["isArchived"] = function() {
			if (!task.isGroup()) {
				var parent = task.getParent();
				return parent.hasOwnProperty("archivedTasks") && getTaskIndex(parent.archivedTasks, task) != null;
			} else {
				return task.tasks.length == 0 && task.hasOwnProperty("archivedTasks") && task.archivedTasks.length > 0;
			}
		}
		task["setArchived"] = function(archived) {
			var parent = task.getParent();
			var sourceArray = null;
			var targetArray = null;
			if (archived) {
				if (!parent.hasOwnProperty("archivedTasks")) {
					parent.archivedTasks = [];
				}
				sourceArray = parent.tasks;
				targetArray = parent.archivedTasks;
			} else {
				if (!parent.hasOwnProperty("tasks")) {
					parent.tasks = [];
				}
				sourceArray = parent.archivedTasks;
				targetArray = parent.tasks;
			}
			var taskIndex = getTaskIndex(sourceArray, task);
			sourceArray.splice(taskIndex, 1);
			targetArray.push(task);

			// Cascade upwards
			if (archived && parent.tasks.length == 0) {
				parent.setArchived(true);
			}
			if (!archived && parent.tasks.length == 1) {
				parent.setArchived(false);
			}
			bus.send("dirty");
		}
		task["getTasks"] = function(includeArchived) {
			if (typeof includeArchived === "undefined") {
				includeArchived = showArchived;
			}
			var ret = [];
			if (includeArchived && task.hasOwnProperty("archivedTasks")) {
				ret = ret.concat(task.archivedTasks);
			}
			ret = ret.concat(task.tasks);

			return ret;
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
		task["getDayEnd"] = function(day) {
			return task.getDayStart() + task.getDayDuration(day);
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

	function addFolders(taskNames) {
		for (var i = 0; i < taskNames.length; i++) {
			var parent = getTask(taskNames[i]).getParent();
			while (parent != ROOT) {
				if (taskNames.indexOf(parent.getTaskName()) == -1) {
					taskNames.splice(i, 0, parent.getTaskName());
				}
				parent = parent.getParent();
			}
		}
	}

	bus.listen("refresh-tree", function(e) {
		decorateAllTasks(ROOT, null);
		timeDomain = ROOT.getPresentationTimeDomain();
		timeDomain[0] = new Date(utils.today.getTime() - 2 * utils.DAY_MILLIS);
		timeDomain = [ new Date(timeDomain[0].getTime() + pan), new Date(timeDomain[1].getTime() + pan) ];
		var childrenFilter = userChildrenFilter != null ? VISIT_ALL_CHILDREN : VISIT_UNFOLDED_CHILDREN;
		var taskFilter = userChildrenFilter != null ? FILTER_SINGLE_TASKS : FILTER_ALL;
		visitTasks(ROOT, FILTER_ALL, VISIT_ALL_CHILDREN, function(task, index) {
			nameIndicesMap[task.getTaskName()] = index;
		});
		taskNames = visitTasks(ROOT, taskFilter, childrenFilter, NAME_EXTRACTOR);
		addFolders(taskNames);

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

	function newPlan(plan) {
		if (!plan.hasOwnProperty("version") || plan.version != CURRENT_VERSION) {
			ROOT.tasks = plan;
		} else {
			ROOT.tasks = plan.tasks;
		}
	}

	bus.listen("plan", function(e, plan) {
		newPlan(plan);
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
			data : JSON.stringify({
				"version" : CURRENT_VERSION,
				"tasks" : ROOT.tasks
			}),
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
			require([ "text!plan?a=" + new Date().getTime() ], function(plan) {
				newPlan(JSON.parse(plan));
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
