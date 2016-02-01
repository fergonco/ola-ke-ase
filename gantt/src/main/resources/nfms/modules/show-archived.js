define([ "message-bus", "utils", "d3" ], function(bus, utils) {

	var showArchived = false;

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Mostrar/Ocultar archivadas").on("click", function() {
		bus.send("show-archived", showArchived = !showArchived);
	});

});