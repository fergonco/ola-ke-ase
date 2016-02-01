define([ "message-bus", "utils", "d3" ], function(bus, utils) {

	var scaleTypes = [ "day", "week", "month" ];
	var scaleTypeIndex = 1;

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Zoom +").on("click", function() {
		if (scaleTypeIndex > 0) {
			scaleTypeIndex--;
		}
		bus.send("set-scale", [ scaleTypes[scaleTypeIndex] ]);
	});

	d3.select("body").append("div")//
	.attr("class", "button")//
	.html("Zoom -").on("click", function() {
		if (scaleTypeIndex < scaleTypes.length) {
			scaleTypeIndex++;
		}
		bus.send("set-scale", [ scaleTypes[scaleTypeIndex] ]);
	});

});