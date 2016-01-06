define([ "message-bus", "task-tree", "message-bus", "d3" ], function(bus, taskTree, bus) {

	var currentStatus = null;
	var status = [];

	var FILTER_STATUS = function(task) {
		return task.getStatus() == currentStatus || task.isGroup();
	};

	var input = d3.select("body").append("select").on("change", function() {
		currentStatus = input.node().value;
		bus.send("filter", [ FILTER_STATUS ]);
	});

	bus.listen("data-ready", function() {
		var statusList = taskTree.getStatusList();
		for (var i = 0; i < statusList.length; i++) {
			input.append("option")//
			.attr("value", statusList[i])//
			.html(statusList[i]);
		}

	});

});