define([ "message-bus" ], function(bus) {

	var loc = window.location;
	var uri;
	if (loc.protocol === "https:") {
		uri = "wss:";
	} else {
		uri = "ws:";
	}
	uri += "//" + loc.host;
	uri += "/websocket-relay/endpoint";

	var socket = new WebSocket(uri);
	socket.onmessage = function(event) {
		bus.send("websocket-receive", event.data);
	}

	bus.listen("websocket-send", function(e, msg) {
		socket.send(msg);
	});

});