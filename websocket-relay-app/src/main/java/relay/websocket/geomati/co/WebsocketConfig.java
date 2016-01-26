package relay.websocket.geomati.co;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import javax.websocket.Endpoint;
import javax.websocket.server.ServerApplicationConfig;
import javax.websocket.server.ServerEndpointConfig;

public class WebsocketConfig implements ServerApplicationConfig {

	@Override
	public Set<Class<?>> getAnnotatedEndpointClasses(Set<Class<?>> arg0) {
		System.out.println("******getAnnotatedEndpointClasses******");
		HashSet<Class<?>> ret = new HashSet<Class<?>>();
		ret.add(WebsocketHandler.class);
		return ret;
	}

	@Override
	public Set<ServerEndpointConfig> getEndpointConfigs(
			Set<Class<? extends Endpoint>> arg0) {
		System.out.println("******getEndpointClasses******");
		return Collections.emptySet();
	}

}
