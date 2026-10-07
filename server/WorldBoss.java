/*
 * World bosses: now and then a great monster rises at its lair, everyone
 * is told, and whoever is on the winning side when it falls shares the
 * reward: gold, experience, a trophy, and a chance at something rare.
 *
 * The "worldbosses" file in the game directory (tools/world/cities/
 * worldbosses.mjs writes it; gods can change it and "boss reload"):
 *   every <minutes>       between bosses, on average (default 180)
 *   spread <minutes>      give or take (default 60)
 *   stay <minutes>        how long one waits to be beaten before it leaves
 *                         (default 60)
 *   gold <n> / exp <n>    each winner's reward (default 300 / 800)
 *   boss <name>|<x>|<y>|<where, in words>|<trophy item>|<rare items,
 *        comma-separated>|<chance of one, 0-1>
 * Each boss's own defMobs file should say "respawn" 0: killed, it's gone
 * (server/Library.java's respawning), and this takes it off the map.
 *
 *   boss                  (anyone) what's about, or when the next is due
 *   boss spawn [name]     (gods) raise one now (a name, or any)
 *   boss clear            (gods) send the one that's about away
 *   boss reload           (gods) read the file again
 *
 * Everything said to everyone starts "World boss: " (js/main.js shows it
 * as a banner over the map); the answer to "boss" starts "Boss: ". A boss is never saved with the map: at start
 * any placed monster with a boss's name is taken away.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.Vector;

public class WorldBoss {
    static final String FILE = "worldbosses";
    static final int GOD_PRIVS = 3;
    static final long STEP_MS = 10000;
    static final Random random = new Random();

    static class Boss {
        String name, place, trophy;
        int x, y;
        String[] rare = new String[0];
        double chance;
    }

    static List<Boss> bosses = new ArrayList<Boss>();
    static int every = 180, spread = 60, stay = 60, gold = 300, exp = 800;
    static volatile Mob alive = null; // the one about now
    static volatile Boss aliveBoss = null;
    static volatile long rose = 0, nextAt = 0;
    static volatile boolean reminded = false;
    static volatile Mob fallen = null; // killed, to take off the map
    static String last = "";
    static DuskEngine engine;

    public static void start(final DuskEngine e) {
        engine = e;
        load();
        // A boss saved with the map by a god: not a placed monster.
        for (Object o : engine.vctMobs.toArray()) {
            Mob m = (Mob) o;
            if (find(m.strName) != null) remove(m);
        }
        schedule(true);
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        Thread.sleep(STEP_MS);
                        tick();
                    } catch (InterruptedException ie) {
                        return;
                    } catch (Exception ex) {
                        Log.logError(ex, "World boss", false);
                    }
                }
            }
        }, "WorldBoss");
        t.setDaemon(true);
        t.start();
    }

    static synchronized void load() {
        List<Boss> out = new ArrayList<Boss>();
        try {
            File f = new File(FILE);
            if (!f.isFile()) { bosses = out; return; }
            for (String raw : Files.readAllLines(f.toPath(), StandardCharsets.ISO_8859_1)) {
                String l = raw.trim();
                if (l.length() == 0 || l.startsWith("#")) continue;
                int sp = l.indexOf(' ');
                if (sp < 0) continue;
                String k = l.substring(0, sp).toLowerCase(), v = l.substring(sp + 1).trim();
                try {
                    if (k.equals("every")) every = Math.max(5, Integer.parseInt(v));
                    else if (k.equals("spread")) spread = Math.max(0, Integer.parseInt(v));
                    else if (k.equals("stay")) stay = Math.max(5, Integer.parseInt(v));
                    else if (k.equals("gold")) gold = Math.max(0, Integer.parseInt(v));
                    else if (k.equals("exp")) exp = Math.max(0, Integer.parseInt(v));
                    else if (k.equals("boss")) {
                        String[] p = v.split("\\|", -1);
                        if (p.length < 4) continue;
                        Boss b = new Boss();
                        b.name = p[0].trim();
                        b.x = Integer.parseInt(p[1].trim());
                        b.y = Integer.parseInt(p[2].trim());
                        b.place = p[3].trim();
                        b.trophy = p.length > 4 ? p[4].trim() : "";
                        if (p.length > 5 && p[5].trim().length() > 0) b.rare = p[5].trim().split("\\s*,\\s*");
                        b.chance = p.length > 6 && p[6].trim().length() > 0 ? Double.parseDouble(p[6].trim()) : 0;
                        out.add(b);
                    }
                } catch (Exception bad) {
                    Log.logError(bad, "World boss: a bad line in " + FILE + ": " + l, false);
                }
            }
        } catch (Exception e) {
            Log.logError(e, "World boss: reading " + FILE, false);
        }
        bosses = out;
    }

    static Boss find(String name) {
        if (name == null) return null;
        for (Boss b : bosses) if (b.name.equalsIgnoreCase(name)) return b;
        return null;
    }

    // The next boss: (every ± spread) minutes from now; at start, half that.
    static void schedule(boolean first) {
        int mins = every + (spread > 0 ? random.nextInt(2 * spread + 1) - spread : 0);
        if (first) mins = Math.max(10, mins / 2);
        nextAt = System.currentTimeMillis() + mins * 60000L;
    }

    static void announce(String text) {
        engine.chatMessage("World boss: " + text);
        Log.logEvent("World boss: " + text);
    }

    static void remove(Mob m) {
        try {
            engine.vctMobs.removeElement(m);
            engine.removeDuskObject(m);
        } catch (Exception e) {
            Log.logError(e, "World boss: removing " + m.strName, false);
        }
    }

    static synchronized void tick() {
        long now = System.currentTimeMillis();
        if (fallen != null) { remove(fallen); fallen = null; }
        Mob m = alive;
        if (m != null) {
            // Dead some other way than a fight's end (no one to reward).
            if (m.intLocX == -6 || m.attributes.getStat("hp") <= 0) {
                if (m.batBattle == null) {
                    announce(m.strName + " is gone.");
                    remove(m);
                    clearAlive();
                }
                return;
            }
            long left = rose + stay * 60000L - now;
            if (!reminded && left < stay * 30000L) {
                reminded = true;
                announce(m.strName + " still prowls " + aliveBoss.place + ", for about " + Math.max(1, left / 60000) + " more minutes.");
            }
            if (left <= 0 && m.batBattle == null) {
                announce(m.strName + " has gone back into hiding. Perhaps next time.");
                remove(m);
                clearAlive();
            }
            return;
        }
        if (now >= nextAt && !bosses.isEmpty()) spawn(null);
    }

    static void clearAlive() {
        alive = null;
        aliveBoss = null;
        reminded = false;
        schedule(false);
    }

    // Raises a boss (named, or any but the last); returns what happened.
    static synchronized String spawn(String name) {
        if (alive != null) return alive.strName + " is already about.";
        if (bosses.isEmpty()) return "There are no world bosses in the " + FILE + " file.";
        Boss b = null;
        if (name != null && name.length() > 0) {
            for (Boss c : bosses) if (c.name.toLowerCase().contains(name.toLowerCase())) { b = c; break; }
            if (b == null) return "No world boss called " + name + ".";
        } else {
            List<Boss> pick = new ArrayList<Boss>();
            for (Boss c : bosses) if (!c.name.equalsIgnoreCase(last) || bosses.size() == 1) pick.add(c);
            b = pick.get(random.nextInt(pick.size()));
        }
        try {
            // From its file as it is now (a hand-edited file's compiled copy
            // would otherwise win, as server/Library.java's editor knows).
            new File("defMobs", CaseFix.file("defMobs", b.name) + ".dsko").delete();
            Mob m = new Mob(b.name, 1, b.x, b.y, engine);
            alive = m;
            aliveBoss = b;
            rose = System.currentTimeMillis();
            reminded = false;
            last = b.name;
            announce(b.name + " has risen " + b.place + "! Gather your friends and hunt it down. (Type boss to hear where.)");
            return "Raised " + b.name + " at " + b.x + ", " + b.y + ".";
        } catch (Exception e) {
            Log.logError(e, "World boss: raising " + b.name, false);
            schedule(false);
            return "Couldn't raise " + b.name + ": " + e.getMessage();
        }
    }

    // Called by Quests.killed when a fight ends with something dead.
    static void killed(LivingThing killed, Vector side) {
        try {
            if (killed == null || killed != alive || side == null) return;
            Boss b = aliveBoss;
            Set<Player> winners = new LinkedHashSet<Player>();
            synchronized (side) {
                for (Object o : side) if (o instanceof Player) winners.add((Player) o);
            }
            List<String> names = new ArrayList<String>();
            for (Player p : winners) {
                names.add(p.strName);
                reward(p, b);
            }
            synchronized (WorldBoss.class) {
                fallen = (Mob) killed;
                clearAlive();
            }
            announce(killed.strName + " has fallen" + (names.isEmpty() ? "!" : " to " + join(names) + "!"));
        } catch (Exception e) {
            Log.logError(e, "World boss: rewarding", false);
        }
    }

    static void reward(Player p, Boss b) {
        p.cash += gold;
        p.exp += exp;
        List<String> got = new ArrayList<String>();
        got.add(gold + " gold");
        got.add(exp + " experience");
        if (b != null && b.trophy.length() > 0 && give(p, b.trophy)) got.add(b.trophy);
        if (b != null && b.rare.length > 0 && random.nextDouble() < b.chance) {
            String r = b.rare[random.nextInt(b.rare.length)];
            if (give(p, r)) got.add(r + " (rare!)");
        }
        p.chatMessage("For your part in felling " + (b != null ? b.name : "the boss") + " you receive " + join(got) + ".\n");
        try {
            p.updateItems();
            p.updateStats();
            p.savePlayer();
        } catch (Exception e) {
            Log.logError(e, "World boss: saving " + p.strName, false);
        }
    }

    static boolean give(Player p, String item) {
        try {
            Item it = engine.getItem(CaseFix.file("defItems", item));
            if (it == null) return false;
            p.items.add((Object) it);
            return true;
        } catch (Exception e) {
            Log.logError(e, "World boss: giving " + item + " to " + p.strName, false);
            return false;
        }
    }

    static String join(List<String> l) {
        if (l.size() <= 1) return l.isEmpty() ? "" : l.get(0);
        return String.join(", ", l.subList(0, l.size() - 1)) + " and " + l.get(l.size() - 1);
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String lower = line.trim().toLowerCase();
        if (!(lower.equals("boss") || lower.startsWith("boss "))) return null;
        String arg = lower.length() > 4 ? line.trim().substring(5).trim() : "";
        String a = arg.toLowerCase();
        if (a.length() == 0) {
            Mob m = alive;
            Boss b = aliveBoss;
            if (m != null && b != null) {
                long left = Math.max(1, (rose + stay * 60000L - System.currentTimeMillis()) / 60000);
                return "Boss: " + m.strName + " is loose " + b.place + " (near " + b.x + ", " + b.y + "), for about " + left + " more minutes.";
            }
            long mins = Math.max(1, (nextAt - System.currentTimeMillis()) / 60000);
            return bosses.isEmpty() ? "There are no world bosses." : "No world boss is about. The next one stirs in about " + (mins >= 90 ? (mins + 30) / 60 + " hours" : mins + " minutes") + ".";
        }
        if (who.privs < GOD_PRIVS) return "Usage: boss";
        if (a.equals("reload")) { load(); return "World bosses: " + bosses.size() + " read from " + FILE + "."; }
        if (a.equals("clear")) {
            synchronized (WorldBoss.class) {
                Mob m = alive;
                if (m == null) return "No world boss is about.";
                if (m.batBattle != null) return m.strName + " is in a fight; let it finish.";
                remove(m);
                clearAlive();
                announce(m.strName + " has gone back into hiding.");
                return "Sent " + m.strName + " away.";
            }
        }
        if (a.equals("spawn") || a.startsWith("spawn ")) return spawn(arg.length() > 5 ? arg.substring(6).trim() : null);
        return "Usage: boss | boss spawn [name] | boss clear | boss reload";
    }
}
