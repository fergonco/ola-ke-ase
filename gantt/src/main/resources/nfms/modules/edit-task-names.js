define([ "message-bus", "task-tree", "ui-generator", "utils", "text!task-schema.json" ], function(
		bus, taskTree, uiGenerator, utils, taskSchema) {

	var selectedTaskName;

	bus.listen("keypress", function(e, d3Event) {
		if (d3Event.keyCode == 113 && d3Event.ctrlKey && selectedTaskName != null) {
			bus.send("edit-selected");
		}
	});

	bus.listen("edit-selected", function() {
		var task = taskTree.getTask(selectedTaskName);
		var input = d3.select("body").append("div")//
		.attr("id", "edit-content")//
		.attr("class", "editable");

		var generated = uiGenerator.populate("edit-content", "edit-content-element", JSON
				.parse(taskSchema), task);
		generated.formAccepted(function(object) {
			if (!task.setTaskName(object["taskName"])) {
				return false;
			}
			task["dailyDuration"] = object["dailyDuration"];
			task["content"] = object["content"];
			task["timeRecords"] = object["timeRecords"];
			return true;
		});
		generated.formClosedOk(function() {
			input.remove();
			bus.send("refresh-tree");
			bus.send("select-task", [ task.taskName ]);
			bus.send("enable-keylistener");
		});
		generated.formClosedCancel(function() {
			input.remove();
			bus.send("enable-keylistener");
		});
		bus.send("disable-keylistener");
	});

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});

	uiGenerator.setCustomParser("time-records", function(text) {
		var timeRecords = [];
		var lines = text.split(/\n/);
		for (var i = 0; i < lines.length; i++) {
			if (lines[i].trim().length == 0) {
				continue;
			}
			var parts = lines[i].match(/(.*):(.*)h(.*)m(.*)s.*-(.*)/);
			var start = new Date(parts[1]);
			start.setHours(parts[2]);
			start.setMinutes(parts[3]);
			start.setSeconds(parts[4]);

			var tr = {
				"start" : start.getTime()
			}
			timeRecords.push(tr);
			if (parts[5].trim().length > 0) {
				var totalSeconds = 0;
				var strTime = parts[5];
				var currentToken = "";
				for (var j = 0; j < strTime.length; j++) {
					var charAt = strTime.charAt(j);
					if (charAt == "h") {
						totalSeconds += 60 * 60 * parseInt(currentToken);
						currentToken = "";
					} else if (charAt == "m") {
						totalSeconds += 60 * parseInt(currentToken);
						currentToken = "";
					} else if (charAt == "s") {
						totalSeconds += parseInt(currentToken);
						currentToken = "";
					} else {
						currentToken += charAt;
					}
				}
				if (totalSeconds > 0) {
					tr["end"] = start.getTime() + 1000 * totalSeconds;
				}
			}
		}

		return timeRecords;
	});
	uiGenerator.setCustomRender("time-records", function(value) {
		var ret = "";
		if (value) {
			for (var i = 0; i < value.length; i++) {
				var tr = value[i];

				var startDate = new Date(tr.start);
				ret += (startDate.getUTCMonth() + 1) + "/" + startDate.getUTCDate() + "/"
						+ startDate.getUTCFullYear() + ": ";
				ret += startDate.getHours() + "h" + startDate.getMinutes() + "m"
						+ startDate.getSeconds() + "s";
				ret += " - " + utils.formatTime(tr.end - tr.start);

				ret += "\n";
			}
		}
		return ret;
	});
});
