package websockets.geomati.co;

import java.io.IOException;
import java.util.HashSet;
import java.util.Set;

import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

@ServerEndpoint(value = "/websocket/endpoint")
public class WebsocketHandler {
	private static final Set<WebsocketHandler> handlers = new HashSet<WebsocketHandler>();
	private Session session;

	@OnOpen
	public synchronized void start(Session session) {
		this.session = session;
		handlers.add(this);
	}

	@OnClose
	public synchronized void end() {
		handlers.remove(this);
	}

	@OnMessage
	public void incoming(String message) {
		broadcastReload(message);
	}

	private void broadcastReload(String message) {
		for (WebsocketHandler handler : handlers) {
			try {
				synchronized (handler) {
					handler.session.getBasicRemote().sendText(message);
				}
			} catch (IOException e) {
				handlers.remove(handler);
				try {
					handler.session.close();
				} catch (IOException e1) {
					// Ignore
				}
			}
		}
	}

}
