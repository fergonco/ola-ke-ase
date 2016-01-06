define([ "message-bus", "d3" ], function(bus) {

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Guardar").on("click", function() {
		bus.send("save");
	});

});