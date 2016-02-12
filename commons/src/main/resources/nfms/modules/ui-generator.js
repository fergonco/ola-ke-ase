define([ "d3" ], function(utils) {

	var customRender = {};
	var customParser = {};

	var toFormString = function(value) {
		if (typeof value == 'undefined') {
			return "";
		} else if (value == null) {
			return "";
		} else {
			return value;
		}
	}

	var setCustomRender = function(name, newRender) {
		customRender[name] = newRender;
	}

	var setCustomParser = function(name, newParser) {
		customParser[name] = newParser;
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

		var selection = d3.select("#" + containerId).selectAll("." + elementClass).data(propertyNames);
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
				var updater = null;

				if (annotations && annotations["customRender"]) {
					input = document.createElement("textArea");
					input.rows = 15;
					input.cols = 80;
					input.value = customRender[annotations["customRender"]](object[d]);
					updater = function() {
						object[d] = customParser[annotations["customParser"]](input.value);
					};
				} else if (type == "integer") {
					input = document.createElement("input");
					input.value = toFormString(object[d]);
					updater = function() {
						if (input.value == "") {
							object[d] = null;
						} else {
							object[d] = parseInt(input.value);
						}
					};
				} else if (type == "float") {
					input = document.createElement("input");
					input.value = toFormString(object[d]);
					updater = function() {
						if (input.value == "") {
							object[d] = null;
						} else {
							object[d] = parseFloat(input.value);
						}
					};
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
					var allowEmptyString = annotations && annotations["allow-empty-string"];
					updater = function() {
						if (input.value == "" && !allowEmptyString) {
							object[d] = null;
						} else {
							object[d] = input.value;
						}
					};
				}
				updaters.push(updater);
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
		"populate" : populate,
		"setCustomParser" : setCustomParser,
		"setCustomRender" : setCustomRender
	}
});