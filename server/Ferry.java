/*
 * Ferries: a ship's captain at a port takes your fare and puts you on the
 * deck of a ship out at sea, with a hidden condition saying where you're
 * bound (voyage_<port>; made with the God tab's dialogue editor: take
 * gold, set flag, teleport). Every second this looks at who's on deck:
 * a line from the crew partway, and after VOYAGE_MS they step off at the
 * port. Someone on deck with nowhere to go (they logged out at sea) is
 * taken to the first port.
 *
 * The ports and the deck are in the game's "ferries" file (re-read when
 * it changes), a line each:
 *   port <key> <x> <y> <name>     where voyage_<key> lands you
 *   deck <x0> <y0> <x1> <y1>      the ship at sea
 *
 * Skills.start starts it. Part of the browser client project
 * (dusk-browser-client/server).
 */
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Ferry {
    static final String FILE = "ferries";
    static final long VOYAGE_MS = 20000;
    static final long HALFWAY_MS = 9000;
    static final String[] SEA_LINES = {
        "The captain calls from the wheel: Fair winds today! We'll make good time.",
        "Gulls wheel over the mast, and spray breaks over the bow.",
        "A sailor points out to sea: Whales, off the starboard side!",
        "The captain calls: Land ho! Not long now.",
    };

    static final class Port {
        final String key, name;
        final int x, y;
        Port(String key, int x, int y, String name) { this.key = key; this.x = x; this.y = y; this.name = name; }
    }

    static final List<Port> ports = new ArrayList<Port>();
    static int deckX0 = 1, deckY0 = 1, deckX1 = 0, deckY1 = 0; // none until loaded
    static long loadedAt = -1;
    // Player name -> when they were first seen on deck; and whether the
    // halfway line was said.
    static final Map<String, Long> boarded = new HashMap<String, Long>();
    static final Map<String, Boolean> told = new HashMap<String, Boolean>();

    public static void start(final DuskEngine engine) {
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        Thread.sleep(1000);
                        load();
                        tick(engine);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Ferry tick", false);
                    }
                }
            }
        }, "Ferry");
        t.setDaemon(true);
        t.start();
    }

    static synchronized void load() {
        File f = new File(FILE);
        if (!f.isFile()) { ports.clear(); deckX0 = 1; deckX1 = 0; loadedAt = -1; return; }
        if (f.lastModified() == loadedAt) return;
        loadedAt = f.lastModified();
        ports.clear();
        deckX0 = 1; deckX1 = 0;
        try {
            BufferedReader r = new BufferedReader(new FileReader(f));
            String line;
            while ((line = r.readLine()) != null) {
                String[] p = line.trim().split("\\s+", 5);
                if (p.length >= 5 && p[0].equals("port")) ports.add(new Port(p[1].toLowerCase(), Integer.parseInt(p[2]), Integer.parseInt(p[3]), p[4]));
                else if (p.length == 5 && p[0].equals("deck")) {
                    deckX0 = Integer.parseInt(p[1]); deckY0 = Integer.parseInt(p[2]);
                    deckX1 = Integer.parseInt(p[3]); deckY1 = Integer.parseInt(p[4]);
                }
            }
            r.close();
            Log.logEvent("Ferry: " + ports.size() + " ports");
        } catch (Exception e) {
            Log.logError(e, "Ferry: reading " + FILE, false);
        }
    }

    static boolean onDeck(LivingThing p) {
        return p.intLocX >= deckX0 && p.intLocX <= deckX1 && p.intLocY >= deckY0 && p.intLocY <= deckY1;
    }

    static synchronized void tick(DuskEngine engine) {
        if (ports.isEmpty()) return;
        long now = System.currentTimeMillis();
        for (Object o : engine.vctSockets.toArray()) {
            LivingThing p = (LivingThing) o;
            String name = p.strName;
            if (!onDeck(p)) { boarded.remove(name); told.remove(name); continue; }
            Port to = null;
            for (Port port : ports) if (p.hasCondition("voyage_" + port.key)) { to = port; break; }
            // Gods looking round the ship aren't sailed off it.
            if (to == null && p.privs >= 3) continue;
            Long since = boarded.get(name);
            if (since == null) {
                boarded.put(name, now);
                p.chatMessage("The crew casts off, and the ship turns out to sea" + (to != null ? ", bound for " + to.name + "." : "."));
                continue;
            }
            long at = now - since;
            if (at >= HALFWAY_MS && !Boolean.TRUE.equals(told.get(name))) {
                told.put(name, true);
                p.chatMessage(SEA_LINES[(int) ((since / 1000) % SEA_LINES.length)]);
            }
            if (at < VOYAGE_MS) continue;
            if (to == null) to = ports.get(0);
            for (Port port : ports) p.removeCondition("voyage_" + port.key);
            boarded.remove(name);
            told.remove(name);
            p.changeLocBypass(to.x, to.y);
            p.chatMessage("The ship docks at " + to.name + ". You step down onto the pier.");
            try {
                if (p instanceof Player) ((Player) p).savePlayer();
            } catch (Exception e) {
                // Saved later.
            }
        }
    }
}
