define([ "message-bus", "utils", "d3" ], function(bus, utils) {

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Mostrar semana").on("click", function() {
		var weekStart = new Date(utils.today.getTime());
		weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
		var weekEnd = new Date(weekStart.getTime() + utils.DAY_MILLIS * 6);
		bus.send("activate-filter", [ weekStart, weekEnd ]);
	});

});