define([ "message-bus", "task-tree", "utils" ], function(bus, taskTree, utils) {

	var selectedTaskName;

	var formatTimeRecord = function(tr) {
		var startDate = new Date(tr.start);
		ret = utils.formatDate(startDate) + ": ";
		ret += startDate.getHours() + "h" + startDate.getMinutes() + "m" + startDate.getSeconds()
				+ "s";
		ret += " - " + utils.formatTime(tr.end - tr.start);

		return ret;
	}

	var formatTimeRecords = function(task) {
		var ret = "";
		if (task.hasOwnProperty("timeRecords")) {
			for (var i = 0; i < task.timeRecords.length; i++) {
				var tr = task.timeRecords[i];
				ret += formatTimeRecord(tr) + "\n";
			}
		}
		return ret;
	}
	var buildTimeRecords = function(text) {
		var timeRecords = [];
		var lines = text.split(/\n/);
		for (var i = 0; i < lines.length; i++) {
			if (lines[i].trim().length == 0) {
				continue;
			}
			var parts = lines[i].match(/(.*):(.*)h(.*)m(.*)s.*-(.*)/);
			console.log(parts);
			var start = new Date(parts[1]);
			start.setHours(parts[2]);
			start.setMinutes(parts[3]);
			start.setSeconds(parts[4]);

			var tr = {
				"start" : start.getTime()
			}
			timeRecords.push(tr);
			if (parts[5].trim().length > 0) {
				var endParts= parts[5].match(/(\d*)h?(\d*)m?(\d*)s/);
				var total = 0;
				for (var j = 1; j <= 3; j++) {
					if (endParts[j] != "") {
						total = total * 60 + parseInt(endParts[j]);
					}
				}
				if (total > 0) {
					tr["end"] = start.getTime() + 1000 * total;
				}
			}
		}

		return timeRecords;
	}

	bus.listen("keypress", function(e, d3Event) {
		if (d3Event.keyCode == 84 && d3Event.shiftKey && selectedTaskName != null) {
			d3Event.preventDefault();
			var task = taskTree.getTask(selectedTaskName);
			var input = d3.select("body").append("div")//
			.attr("class", "editable")//
			.append("xhtml:textarea").html(function() {
				this.focus();
				return formatTimeRecords(task);
			})//
			.style("width", "100%")//
			.style("height", "100%")//
			.attr("rows", "15");
			edit(input, function(e) {
				return e.keyCode == 13 && e.ctrlKey
			}, function(text) {
				task["timeRecords"] = buildTimeRecords(text);
				return true;
			});

		}
	});

	var edit = function(input, acceptInput, enterAction) {
		// make the form go away when you jump out (form looses focus) or
		// hit ENTER:
		input.on("keydown", function() {
			// IE fix
			if (!d3.event)
				d3.event = window.event;

			var e = d3.event;
			if (acceptInput(e)) {
				if (typeof (e.cancelBubble) !== 'undefined') // IE
					e.cancelBubble = true;
				if (e.stopPropagation)
					e.stopPropagation();
				e.preventDefault();

				var task = taskTree.getTask(selectedTaskName);
				if (enterAction(input.node().value)) {
					input.remove();
					bus.send("enable-keylistener");
					bus.send("refresh-tree");
					bus.send("select-task", [ task.taskName ]);
				}
			} else if (e.keyCode == 27) {
				input.remove();
				bus.send("enable-keylistener");
			}
		});
		bus.send("disable-keylistener");
	}

	bus.listen("selection-update", function(e, newSelectedName) {
		selectedTaskName = newSelectedName;
	});

});
