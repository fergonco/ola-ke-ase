define([ "message-bus", "utils", "d3" ], function(bus, utils) {

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Mostrar hoy").on(
			"click",
			function() {
				bus.send("activate-filter", [ utils.today.getTime(),
						utils.today.getTime() + utils.DAY_MILLIS ]);
			});

});