package expo.modules.morningalarm;

import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Test;
import static org.junit.Assert.*;

@UnstableApi
public class MusicPlayerListenerTest {
  @Test public void everyMedia3CallbackReachesItsObserver() throws Exception {
    List<Method> received = new ArrayList<>();
    List<Object[]> payloads = new ArrayList<>();
    Player.Listener observer = (Player.Listener) Proxy.newProxyInstance(
        Player.Listener.class.getClassLoader(), new Class<?>[] {Player.Listener.class},
        (proxy, method, args) -> { received.add(method); payloads.add(args); return null; });
    AtomicInteger commandReads = new AtomicInteger();
    // Null payloads let this test exercise forwarding without constructing Android framework objects.
    MusicPlayerListener forwarding = new MusicPlayerListener(observer, () -> {
      commandReads.incrementAndGet(); return null;
    });
    for (Method callback : Player.Listener.class.getDeclaredMethods()) {
      if (!callback.isDefault() || !callback.getName().startsWith("on")) continue;
      Class<?>[] types = callback.getParameterTypes();
      Object[] values = new Object[types.length];
      for (int i = 0; i < types.length; i++) {
        if (types[i] == boolean.class) values[i] = true;
        else if (types[i] == int.class) values[i] = 7;
        else if (types[i] == long.class) values[i] = 123L;
        else if (types[i] == float.class) values[i] = 0.5f;
      }
      received.clear();
      payloads.clear();
      callback.invoke(forwarding, values);
      assertEquals("Lost callback: " + callback.getName(), 1, received.size());
      assertEquals(callback, received.get(0));
      if (!callback.getName().equals("onAvailableCommandsChanged")) {
        assertArrayEquals(values.length == 0 ? null : values, payloads.get(0));
      }
    }
    assertEquals(1, commandReads.get());
  }
}
