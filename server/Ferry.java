/*
 * Ferries that really sail: ships on a timetable that leave port, cross
 * the sea square by square along their route, and dock at the next port,
 * with their passengers aboard the whole way.
 *
 * A ship isn't on the map: the server keeps where it is, and tells
 * everyone near it, every step, in a line the client draws it from
 *   Ship: <id> <x> <y> <heading in degrees, 0 east, 90 south> <name>
 *   Ship: <id> gone                 (out of your sight now)
 * (Only to browser players: the Java client can't draw a ship and would
 * print the lines.) Passengers stand on the 3 x 3 squares in the middle of the deck and
 * are moved with it, a step at a time like walking, so their view slides
 * across the sea; they can walk about those squares too (FixedEngine
 * lets them, see allowMove).
 *
 * Tickets: a port's captain takes the fare and sets the hidden condition
 * voyage_<port> (God tab dialogue editor). Anyone with a ticket for the
 * ship's next port who is near the dock while she's in is taken aboard;
 * at the port their ticket is for, they step off onto the pier. Someone
 * left in the water (logged out at sea) is put ashore at the first port.
 *
 * The game's "ferries" file (re-read when it changes), a line each:
 *   port <key> <x> <y> <name>      the pier square passengers step onto
 *   dock <key> <x> <y> <heading> [<other port>]
 *                                  where a ship's centre waits, facing;
 *                                  with another port, the berth for ships
 *                                  sailing to and from it
 *   route <from> <to> <file> [<ship>]
 *                                  the squares between two docks, "x y"
 *                                  a line (the way back is the same,
 *                                  reversed); with a ship's name, that
 *                                  ship's own lane
 *   step <ms>                      how long a ship takes over a square
 *                                  (default 125: eight squares a second)
 * Two ships on one crossing start at opposite ends and keep in step: one
 * on a shorter lane waits in port for the difference.
 *   ship <name> <port> <port> ...  a ship and the ports it calls at,
 *                                  back and forth
 *
 *   ferry                          where each ship is and when it's due
 *
 * Skills.start starts it; Props.command hands it commands. Part of the browser client project
 * (dusk-browser-client/server).
 */
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class Ferry {
    static final String FILE = "ferries";
    static final long STEP_MS = 125;        // a square every eighth of a second, unless the file says
    static volatile long stepMs = STEP_MS;
    static final long DOCK_MS = 45000;      // time in port
    static final int SIGHT = 14;            // squares away a ship is seen
    static final int BOARD_RANGE = 10;      // squares from the docked ship to be taken aboard
    static final String[] SEA_LINES = {
        "The captain calls from the wheel: Fair winds today!",
        "Gulls wheel over the masts, and spray breaks over the bow.",
        "A sailor points out to sea: Whales, off the starboard side!",
        "The sails crack and fill, and the ship leans into the wind.",
    };

    static final class Port {
        String key, name;
        int x, y;               // the pier square
        int dockX, dockY, dockHeading;
        final Map<String, int[]> berths = new HashMap<String, int[]>(); // other port -> x, y, heading
        int[] berth(String other) {
            int[] b = berths.get(other);
            return b != null ? b : new int[] { dockX, dockY, dockHeading };
        }
    }

    static final class Ship {
        int id;
        String name;
        List<String> calls = new ArrayList<String>(); // ports, in order
        int leg = 0;            // sailing calls[leg] -> calls[leg + 1] (back and forth)
        int[][] path;           // the current leg's squares
        int step = 0;           // where on it
        boolean docked = true;
        long dockedSince;
        long dockMs = DOCK_MS;  // this stay in port
        volatile int x, y, heading;
        final Set<String> passengers = new HashSet<String>();
        final Set<String> seenBy = new HashSet<String>();
        boolean saidHalfway;
    }

    static final Map<String, Port> ports = new LinkedHashMap<String, Port>();
    static final Map<String, int[][]> routes = new HashMap<String, int[][]>();
    static final List<Ship> ships = new ArrayList<Ship>();
    // Player name -> ship. Read without the lock by allowMove, which runs
    // inside a player's own move (holding the player): no waiting on the
    // ferry's lock there, or the two could wait on each other.
    static final Map<String, Ship> aboard = new ConcurrentHashMap<String, Ship>();
    static final Set<String> told = new HashSet<String>(); // ticket holders told when the ship comes
    static long loadedAt = -1;

    public static void start(final DuskEngine engine) {
        Thread t = new Thread(new Runnable() {
            public void run() {
                long next = System.currentTimeMillis();
                while (true) {
                    try {
                        next += stepMs;
                        long wait = next - System.currentTimeMillis();
                        if (wait > 0) Thread.sleep(wait);
                        else next = System.currentTimeMillis(); // fell behind: don't race to catch up
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

    // ---- the ferries file ----

    static synchronized void load() {
        File f = new File(FILE);
        if (!f.isFile() || f.lastModified() == loadedAt) return;
        loadedAt = f.lastModified();
        ports.clear();
        routes.clear();
        stepMs = STEP_MS;
        List<String[]> shipLines = new ArrayList<String[]>();
        try {
            BufferedReader r = new BufferedReader(new FileReader(f));
            String line;
            while ((line = r.readLine()) != null) {
                String[] p = line.trim().split("\\s+");
                if (p.length == 0 || p[0].startsWith("#")) continue;
                if (p[0].equals("port") && p.length >= 5) {
                    Port port = portFor(p[1]);
                    port.x = Integer.parseInt(p[2]);
                    port.y = Integer.parseInt(p[3]);
                    port.name = line.trim().split("\\s+", 5)[4];
                } else if (p[0].equals("dock") && (p.length == 5 || p.length == 6)) {
                    Port port = portFor(p[1]);
                    int[] b = { Integer.parseInt(p[2]), Integer.parseInt(p[3]), Integer.parseInt(p[4]) };
                    if (p.length == 6) port.berths.put(p[5].toLowerCase(), b);
                    else { port.dockX = b[0]; port.dockY = b[1]; port.dockHeading = b[2]; }
                } else if (p[0].equals("route") && (p.length == 4 || p.length == 5)) {
                    int[][] path = readPath(new File(p[3]));
                    if (path.length > 1) {
                        String who = p.length == 5 ? p[4].replace('_', ' ') + "|" : "";
                        routes.put(who + p[1].toLowerCase() + ">" + p[2].toLowerCase(), path);
                        int[][] back = new int[path.length][];
                        for (int i = 0; i < path.length; i++) back[i] = path[path.length - 1 - i];
                        routes.put(who + p[2].toLowerCase() + ">" + p[1].toLowerCase(), back);
                    }
                } else if (p[0].equals("step") && p.length == 2) {
                    stepMs = Math.max(50, Math.min(1000, Long.parseLong(p[1])));
                } else if (p[0].equals("ship") && p.length >= 4) {
                    shipLines.add(p);
                }
            }
            r.close();
        } catch (Exception e) {
            Log.logError(e, "Ferry: reading " + FILE, false);
        }
        // Ships keep sailing through a reload if they're still in the file.
        Map<String, Ship> old = new HashMap<String, Ship>();
        for (Ship s : ships) old.put(s.name, s);
        ships.clear();
        int id = 1;
        for (String[] p : shipLines) {
            String name = p[1].replace('_', ' ');
            Ship s = old.containsKey(name) ? old.get(name) : new Ship();
            s.id = id++;
            if (s.name == null) {
                s.name = name;
                for (int i = 2; i < p.length; i++) if (ports.containsKey(p[i].toLowerCase())) s.calls.add(p[i].toLowerCase());
                if (s.calls.size() < 2) continue;
                int[] b = ports.get(s.calls.get(0)).berth(s.calls.get(1));
                s.x = b[0]; s.y = b[1]; s.heading = b[2];
                s.docked = true;
                s.dockedSince = System.currentTimeMillis();
            }
            ships.add(s);
        }
        Log.logEvent("Ferry: " + ports.size() + " ports, " + routes.size() / 2 + " routes and lanes, " + ships.size() + " ships");
    }

    static Port portFor(String key) {
        Port p = ports.get(key.toLowerCase());
        if (p == null) { p = new Port(); p.key = key.toLowerCase(); p.name = key; ports.put(p.key, p); }
        return p;
    }

    static int[][] readPath(File f) throws Exception {
        List<int[]> pts = new ArrayList<int[]>();
        BufferedReader r = new BufferedReader(new FileReader(f));
        String line;
        while ((line = r.readLine()) != null) {
            String[] p = line.trim().split("\\s+");
            if (p.length == 2) pts.add(new int[] { Integer.parseInt(p[0]), Integer.parseInt(p[1]) });
        }
        r.close();
        return pts.toArray(new int[0][]);
    }

    // ---- moving ----

    static String from(Ship s) { return s.calls.get(legIndex(s, s.leg)); }
    static String to(Ship s) { return s.calls.get(legIndex(s, s.leg + 1)); }
    // Back and forth along the calls: 0 1 2 1 0 1 2 ...
    static int legIndex(Ship s, int n) {
        int len = s.calls.size(), period = 2 * (len - 1);
        int k = ((n % period) + period) % period;
        return k < len ? k : period - k;
    }

    static synchronized void tick(DuskEngine engine) {
        if (ships.isEmpty()) return;
        long now = System.currentTimeMillis();
        Object[] online = engine.vctSockets.toArray();
        for (Ship s : ships) {
            if (s.docked) {
                board(engine, s, online, now);
                if (now - s.dockedSince >= s.dockMs) depart(engine, s, online);
            } else {
                sail(engine, s, online);
            }
            show(s, online);
        }
        rescue(engine, online);
    }

    static void depart(DuskEngine engine, Ship s, Object[] online) {
        int[][] path = routeOf(s, from(s), to(s));
        if (path == null) { s.dockedSince = System.currentTimeMillis(); return; }
        s.path = path;
        s.step = 0;
        s.docked = false;
        s.saidHalfway = false;
        Port dest = ports.get(to(s));
        near(s, online, "The " + s.name + " casts off for " + dest.name + ".");
        for (String name : s.passengers) told.remove(name);
    }

    // A ship's own lane if it has one, else the crossing's route.
    static int[][] routeOf(Ship s, String a, String b) {
        int[][] own = routes.get(s.name + "|" + a + ">" + b);
        return own != null ? own : routes.get(a + ">" + b);
    }

    // The longest crossing between these two ports, by any ship's lane.
    static int longest(String a, String b) {
        int n = 0;
        for (Ship o : ships) {
            int[][] r = routeOf(o, a, b);
            if (r != null && (o.calls.contains(a) && o.calls.contains(b))) n = Math.max(n, r.length);
        }
        return n;
    }

    static void sail(DuskEngine engine, Ship s, Object[] online) {
        if (s.step + 1 >= s.path.length) { arrive(engine, s, online); return; }
        s.step++;
        int nx = s.path[s.step][0], ny = s.path[s.step][1];
        int dx = nx - s.x, dy = ny - s.y;
        s.x = nx; s.y = ny;
        // Heading: from a few squares back to a few ahead (smooth on
        // diagonals, which the route takes as staircases).
        int a = Math.max(0, s.step - 4), b = Math.min(s.path.length - 1, s.step + 4);
        if (a != b) s.heading = (int) Math.round(Math.toDegrees(Math.atan2(s.path[b][1] - s.path[a][1], s.path[b][0] - s.path[a][0])));
        byte dir = dx > 0 ? (byte) 27 : dx < 0 ? (byte) 26 : dy > 0 ? (byte) 25 : (byte) 24;
        for (Object o : online) {
            LivingThing p = (LivingThing) o;
            if (aboard.get(p.strName) != s) continue;
            // Gone from the deck some other way (a god's teleport, death):
            // no longer aboard.
            if (Math.abs(p.intLocX - (nx - dx)) > 2 || Math.abs(p.intLocY - (ny - dy)) > 2) {
                aboard.remove(p.strName);
                s.passengers.remove(p.strName);
                continue;
            }
            int px = p.intLocX + dx, py = p.intLocY + dy;
            if (Math.abs(px - nx) > 1 || Math.abs(py - ny) > 1) { px = nx; py = ny; }
            p.moveTo(px, py, dir);
            if (p.intLocX != px || p.intLocY != py) p.changeLocBypass(px, py);
        }
        if (!s.saidHalfway && s.step * 2 >= s.path.length) {
            s.saidHalfway = true;
            for (Object o : online) {
                LivingThing p = (LivingThing) o;
                if (aboard.get(p.strName) == s) p.chatMessage(SEA_LINES[(int) (System.currentTimeMillis() / 1000 % SEA_LINES.length)]);
            }
        }
    }

    static void arrive(DuskEngine engine, Ship s, Object[] online) {
        Port port = ports.get(to(s));
        int[] b = port.berth(from(s));
        s.docked = true;
        s.dockedSince = System.currentTimeMillis();
        // Wait for the difference if another ship's lane on this crossing
        // is longer, so ships sharing it stay in step.
        s.dockMs = DOCK_MS + (long) Math.max(0, longest(from(s), to(s)) - s.path.length) * stepMs;
        s.x = b[0]; s.y = b[1]; s.heading = b[2];
        s.leg++;
        for (Object o : online) {
            LivingThing p = (LivingThing) o;
            if (aboard.get(p.strName) != s) continue;
            // Everyone off at the end of a leg whose ticket is for here
            // (or who had none).
            boolean here = p.hasCondition("voyage_" + port.key);
            boolean other = false;
            for (String k : ports.keySet()) if (!k.equals(port.key) && p.hasCondition("voyage_" + k)) other = true;
            if (!here && other) continue;
            land(p, port);
            aboard.remove(p.strName);
            s.passengers.remove(p.strName);
        }
        near(s, online, "The " + s.name + " docks at " + port.name + ".");
    }

    static void land(LivingThing p, Port port) {
        for (String k : ports.keySet()) p.removeCondition("voyage_" + k);
        p.changeLocBypass(port.x, port.y);
        p.chatMessage("You step down onto the pier at " + port.name + ".");
        try {
            if (p instanceof Player) ((Player) p).savePlayer();
        } catch (Exception e) {
            // Saved later.
        }
    }

    // Ticket holders for the ship's next port, near the dock, go aboard;
    // those waiting while she's at sea are told when she's due.
    static void board(DuskEngine engine, Ship s, Object[] online, long now) {
        Port next = ports.get(to(s));
        for (Object o : online) {
            LivingThing p = (LivingThing) o;
            if (aboard.containsKey(p.strName)) continue;
            if (Math.abs(p.intLocX - s.x) > BOARD_RANGE || Math.abs(p.intLocY - s.y) > BOARD_RANGE) continue;
            if (!p.hasCondition("voyage_" + next.key)) continue;
            int n = s.passengers.size();
            int px = s.x - 1 + n % 3, py = s.y - 1 + (n / 3) % 3;
            p.changeLocBypass(px, py);
            aboard.put(p.strName, s);
            s.passengers.add(p.strName);
            long left = (s.dockMs - (now - s.dockedSince)) / 1000;
            p.chatMessage("You go aboard the " + s.name + ", bound for " + next.name + ". She sails in " + Math.max(1, left) + " seconds.");
        }
    }

    // A ship's position to everyone in sight of it, and "gone" to those
    // who've lost sight of it.
    static void show(Ship s, Object[] online) {
        String line = "Ship: " + s.id + " " + s.x + " " + s.y + " " + s.heading + " " + s.name;
        Set<String> now = new HashSet<String>();
        for (Object o : online) {
            LivingThing p = (LivingThing) o;
            // Only browsers draw ships; the Java client would print the lines.
            if (!(p instanceof Player) || !(((Player) p).sckConnection instanceof BridgedSocket)) continue;
            if (Math.abs(p.intLocX - s.x) <= SIGHT && Math.abs(p.intLocY - s.y) <= SIGHT) {
                p.chatMessage(line);
                now.add(p.strName);
            } else if (s.seenBy.contains(p.strName)) {
                p.chatMessage("Ship: " + s.id + " gone");
            }
        }
        s.seenBy.clear();
        s.seenBy.addAll(now);
    }

    static void near(Ship s, Object[] online, String text) {
        for (Object o : online) {
            LivingThing p = (LivingThing) o;
            if (Math.abs(p.intLocX - s.x) <= SIGHT && Math.abs(p.intLocY - s.y) <= SIGHT) p.chatMessage(text);
        }
    }

    // Someone standing in the sea who isn't aboard (they logged out at sea,
    // and the ship sailed on): ashore at their ticket's port, or the first.
    static void rescue(DuskEngine engine, Object[] online) {
        if (ports.isEmpty()) return;
        for (Object o : online) {
            LivingThing p = (LivingThing) o;
            if (aboard.containsKey(p.strName) || p.privs >= 3) continue;
            int t;
            try {
                t = engine.shrMap[p.intLocX][p.intLocY];
            } catch (Exception e) {
                continue;
            }
            if (t != 0 && t != 65) continue;
            Port to = null;
            for (Port port : ports.values()) if (p.hasCondition("voyage_" + port.key)) { to = port; break; }
            land(p, to != null ? to : ports.values().iterator().next());
        }
        // Passengers who logged out: off the ship's list.
        Set<String> names = new HashSet<String>();
        for (Object o : online) names.add(((LivingThing) o).strName);
        aboard.keySet().retainAll(names);
        for (Ship s : ships) s.passengers.retainAll(names);
    }

    // "ferry": where each ship is, and when it's due at each port.
    public static String command(LivingThing who, DuskEngine engine, String line) {
        if (!line.trim().equalsIgnoreCase("ferry") && !line.trim().equalsIgnoreCase("ferries")) return null;
        synchronized (Ferry.class) {
            if (ships.isEmpty()) return "No ships are sailing.";
            long now = System.currentTimeMillis();
            // A message per ship: a line break inside one would break the
            // client's reading of the stream.
            for (Ship s : ships) {
                StringBuilder b = new StringBuilder();
                Port a = ports.get(from(s)), z = ports.get(to(s));
                if (s.docked) {
                    long left = Math.max(0, s.dockMs - (now - s.dockedSince)) / 1000;
                    b.append("The ").append(s.name).append(" is in at ").append(a.name).append(", sailing for ").append(z.name).append(" in ").append(left).append(" seconds.");
                } else {
                    long left = (long) (s.path.length - 1 - s.step) * stepMs / 1000;
                    b.append("The ").append(s.name).append(" is at sea, bound for ").append(z.name).append(": due in about ").append(Math.max(1, Math.round(left / 60.0))).append(" minute").append(Math.round(left / 60.0) <= 1 ? "" : "s").append(".");
                }
                who.chatMessage(b.toString());
            }
            return "";
        }
    }

    // FixedEngine.canMoveTo asks: may this step happen though the square
    // is sea? Yes for a passenger, onto their ship's deck.
    static boolean allowMove(LivingThing who, int x, int y) {
        Ship s = aboard.get(who.strName);
        return s != null && Math.abs(x - s.x) <= 1 && Math.abs(y - s.y) <= 1;
    }
}
