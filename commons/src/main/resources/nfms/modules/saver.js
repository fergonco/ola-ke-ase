define([ "message-bus", "d3" ], function(bus) {

	var timerId;

	bus.listen("dirty", function() {
		window.clearInterval(timerId);

		timerId = window.setInterval(function() {
			bus.send("save");
		}, 1000);
	});

	bus.listen("saved", function() {
		window.clearInterval(timerId);
	});

	d3.select("body").append("div")//
	.attr("class", "button")//
	.attr("id", "dirtyIndicator");

	bus.listen("dirty", function() {
		d3.select("#dirtyIndicator").style("background-color", "red");
	});

	bus.listen("saved", function() {
		d3.select("#dirtyIndicator").style("background-color", "blue");
	});

});