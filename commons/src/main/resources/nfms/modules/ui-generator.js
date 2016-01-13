define([ "d3" ], function(utils) {

	var toFormString = function(value) {
		if (typeof value == 'undefined') {
			return "";
		} else if (value == null) {
			return "";
		} else {
			return value;
		}
	}

	var populate = function(containerId, elementClass, schema, originalObject) {
		var acceptCallback = null;
		var closedOkCallback = null;
		var closedCancelCallback = null;
		var object = {};
		var updaters = [];
		var propertyNames = [];
		for ( var name in schema.properties) {
			if (schema.properties.hasOwnProperty(name)) {
				propertyNames.push(name);
				var value = null;
				var getterName = "get" + name.charAt(0).toUpperCase() + name.substr(1);
				if (originalObject.hasOwnProperty(getterName) && typeof originalObject[getterName] === "function") {
					value = originalObject[getterName]();
				} else {
					value = originalObject[name];
				}
				object[name] = value;
			}
		}

		var selection = d3.select("#" + containerId).selectAll("." + elementClass).data(
				propertyNames);
		selection.enter().append(function(d) {
			var property = schema.properties[d];
			var type = property.type;
			var annotations = property["ui-annotations"];
			var div = document.createElement("div");
			div.id = "div-" + d;

			var divSelection = d3.select(div);//
			divSelection.append("span").html(property.title);
			divSelection.append(function() {
				var input = null;
				if (type == "integer") {
					input = document.createElement("input");
					input.value = toFormString(object[d]);
				} else if (type == "string") {
					if (annotations && annotations["multiline"]) {
						input = document.createElement("textArea");
						input.rows = 15;
						input.cols = 80;
						input.value = toFormString(object[d]);
					} else {
						input = document.createElement("input");
						input.value = toFormString(object[d]);
					}
				}
				updaters.push(function() {
					object[d] = input.value;
				});
				if (input != null) {
					d3.select(input).on("keydown", function() {
						// IE fix
						if (!d3.event)
							d3.event = window.event;

						var e = d3.event;
						if (e.keyCode == 13 && e.ctrlKey) {
							if (typeof (e.cancelBubble) !== 'undefined') // IE
								e.cancelBubble = true;
							if (e.stopPropagation)
								e.stopPropagation();
							e.preventDefault();

							// build object
							for (var i = 0; i < updaters.length; i++) {
								updaters[i]();
							}
							// apply
							if (acceptCallback(object)) {
								if (closedOkCallback) {
									closedOkCallback();
								}
							}
						} else if (e.keyCode == 27) {
							if (closedCancelCallback) {
								closedCancelCallback();
							}
						}

					});

				}
				return input;
			});

			return div;
		});
		selection.attr("class", elementClass);
		var firstInput = d3.select("#" + containerId + " input").node();
		firstInput.focus();
		firstInput.select();

		var formAccepted = function(callback) {
			acceptCallback = callback;
		}
		var formClosedOk = function(callback) {
			closedOkCallback = callback;
		}
		var formClosedCancel = function(callback) {
			closedCancelCallback = callback;
		}

		return {
			"formAccepted" : formAccepted,
			"formClosedOk" : formClosedOk,
			"formClosedCancel" : formClosedCancel
		}
	}

	return {
		"populate" : populate
	}
});