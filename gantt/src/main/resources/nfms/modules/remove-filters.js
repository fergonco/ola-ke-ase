define([ "message-bus", "utils", "d3" ], function(bus, utils) {
	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Quitar filtros").on("click", function() {
		bus.send("deactivate-filter");
		bus.send("set-task-styler", null);
	});

});