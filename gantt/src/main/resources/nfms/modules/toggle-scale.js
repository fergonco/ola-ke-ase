define([ "message-bus", "utils", "d3" ], function(bus, utils) {

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Zoom +").on("click", function() {
		bus.send("set-scale", [ "day" ]);
	});

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Zoom -").on("click", function() {
		bus.send("set-scale", [ "week" ]);
	});

});