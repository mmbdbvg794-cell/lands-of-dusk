// Who's online, for the web page (who.html): every 30 seconds, the players
// in the game go into who.json in the game directory, which serve.py
// hands out as who.json beside the page. Gods who chose not to be seen
// (wizInvis) are left out.
//
// { "updated": <ms>, "players": [ { "name", "race", "title", "god", "since" } ] }
// since: when they came online (ms), as first seen here.

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Who {
    static final long STEP_MS = 30000;
    static final String FILE = "who.json";
    static final Map<String, Long> since = new HashMap<String, Long>();

    public static void start(final DuskEngine engine) {
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        write(engine);
                        Thread.sleep(STEP_MS);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Who's online", false);
                        try { Thread.sleep(STEP_MS); } catch (InterruptedException ie) { return; }
                    }
                }
            }
        }, "Who");
        t.setDaemon(true);
        t.start();
    }

    static void write(DuskEngine engine) throws Exception {
        List<Object> players;
        synchronized (engine.vctSockets) {
            players = new ArrayList<Object>(engine.vctSockets);
        }
        long now = System.currentTimeMillis();
        Map<String, Long> seen = new HashMap<String, Long>();
        StringBuilder out = new StringBuilder("{\"updated\":").append(now).append(",\"players\":[");
        boolean first = true;
        for (Object o : players) {
            if (!(o instanceof Player)) continue;
            Player p = (Player) o;
            if (p.strName == null || p.wizInvis) continue;
            String key = p.strName.toLowerCase();
            Long at = since.get(key);
            seen.put(key, at == null ? now : at);
            if (!first) out.append(',');
            first = false;
            out.append("{\"name\":").append(json(p.strName))
                .append(",\"race\":").append(json(p.strRace))
                .append(",\"title\":").append(json(p.strTitle))
                .append(",\"god\":").append(p.privs > 1)
                .append(",\"since\":").append(seen.get(key)).append('}');
        }
        out.append("]}\n");
        since.clear();
        since.putAll(seen);
        File tmp = new File(FILE + ".new");
        Talk.write(tmp, out.toString().getBytes("UTF-8"));
        if (!tmp.renameTo(new File(FILE))) Talk.write(new File(FILE), out.toString().getBytes("UTF-8"));
    }

    static String json(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
            else b.append(c);
        }
        return b.append('"').toString();
    }
}
