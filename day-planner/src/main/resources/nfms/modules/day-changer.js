define([ "message-bus", "d3" ], function(bus) {

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Day +").on("click", function() {
		bus.send("day+");
	});
	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Day -").on("click", function() {
		bus.send("day-");
	});

});