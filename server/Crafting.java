/*
 * Mining and smithing.
 *
 * Mining: ore veins are props ("bronze vein", "iron vein", "coal seam",
 * "mithril vein"; VEINS). Standing next to one with a mining pick in your
 * pack, "mine" swings at it every few seconds until you move, fight, the
 * vein is worked out or you type "mine stop". Each swing may give a lump
 * of ore. A vein holds a few lumps, then shows as worked out (WORKED_OUT,
 * the image only: its name stays, so a god's save never writes it down
 * changed) and fills again some minutes later.
 *
 * Smithing: by a forge, ore is smelted into bars; by an anvil, with a
 * smithing hammer, bars are made into gear. What can be made is in the
 * game's "recipes" file, one per line:
 *
 *   station|level|result|ingredient, ingredient...
 *   forge|0|bronze bar|2 bronze ore
 *   anvil|0|bronze sword|3 bronze bar
 *
 * read again whenever it changes. "level" is the Smithing needed.
 *
 * Mining and Smithing are skills (0-100, kept and shown like any other),
 * which rise now and then with use, slower as they get higher and much
 * slower on work far below them.
 *
 *   mine [<id>]          start mining (the nearest vein, or that one)
 *   mine stop            stop
 *   smith                what you can make here
 *   smith <result> [n]   make it (n at once, up to 20)
 *
 * Every reply is plain words, so the old Java client can play too; the
 * browser client also gets lines it reads and hides (only it is sent them,
 * through the bridge): "Mining: <ms>|<vein>" as each swing starts and
 * "Mining: done" at the end (a progress bar), and for "smith" one
 * "Recipe: station|level|result|ingredients|how many you can make" per
 * recipe, then "Recipes: <station,station>|<your Smithing>" (the smithing
 * window).
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

public class Crafting {
    // name -> { ore, Mining needed, image when full }
    static final Object[][] VEINS = {
        { "bronze vein", "bronze ore", 0, 58 },
        { "iron vein", "iron ore", 15, 59 },
        { "coal seam", "coal", 30, 60 },
        { "mithril vein", "mithril ore", 60, 61 },
    };
    static final int WORKED_OUT = 62;
    static final String PICK = "mining pick", HAMMER = "smithing hammer";
    static final long TICK = 250;
    static final int STATION_REACH = 2, VEIN_REACH = 1, MAX_MAKE = 20;
    static final Random random = new Random();

    // ---- veins ----

    static class Vein {
        int left = -1;       // lumps left; -1 until first mined
        long fullAgain = 0;  // when a worked-out vein fills again
    }

    static class Dig {
        Player who;
        Prop vein;
        Object[] kind;
        int x, y;
        long swingEnds;
    }

    static final Map<Integer, Vein> veins = new HashMap<Integer, Vein>();
    static final Map<String, Dig> digging = new HashMap<String, Dig>();

    static Object[] veinKind(DuskObject o) {
        if (!(o instanceof Prop) || o.strName == null) return null;
        String n = Talk.bare(o.strName).toLowerCase();
        for (Object[] v : VEINS) if (n.equals(v[0])) return v;
        return null;
    }

    static boolean has(LivingThing who, String item) {
        return who.items.getItem(item, 0) != null;
    }

    static int count(LivingThing who, String item) {
        int n = 0;
        while (who.items.getItem(item, n) != null) n++;
        return n;
    }

    static boolean browser(LivingThing who) {
        return who instanceof Player && BridgedSocket.browser(((Player) who).sckConnection);
    }

    // "an iron bar", "a bronze sword", "bronze gloves".
    static String a(String name) {
        if (name.endsWith("s")) return name;
        return ("aeiou".indexOf(Character.toLowerCase(name.charAt(0))) >= 0 ? "an " : "a ") + name;
    }

    static String many(int n, String name) {
        return n == 1 ? a(name) : n + " " + (name.endsWith("s") ? name : name + "s");
    }

    static void tell(LivingThing who, String line) {
        who.chatMessage(line + "\n");
    }

    // A changed picture, sent to everyone who can see it.
    static void showImage(DuskEngine engine, DuskObject o) {
        String msg = "\u001f" + o.ID + "\n" + o.intImage + "\n";
        Object[] socks;
        synchronized (engine.vctSockets) {
            socks = engine.vctSockets.toArray();
        }
        int range = engine.viewrange + 1;
        for (Object s : socks) {
            if (!(s instanceof Player)) continue;
            Player q = (Player) s;
            if (Math.abs(q.intLocX - o.intLocX) > range || Math.abs(q.intLocY - o.intLocY) > range) continue;
            try {
                q.send(msg);
            } catch (Exception e) {
                // They'll see it when it next comes into view.
            }
        }
    }

    static Prop nearestVein(DuskEngine engine, LivingThing who) {
        Prop best = null;
        int bestD = Integer.MAX_VALUE;
        for (Object o : engine.vctProps.toArray()) {
            Prop p = (Prop) o;
            if (p == null || veinKind(p) == null) continue;
            int d = Math.max(Math.abs(p.intLocX - who.intLocX), Math.abs(p.intLocY - who.intLocY));
            if (d > VEIN_REACH) continue;
            // A vein with ore in it before a worked-out one.
            if (p.intImage == WORKED_OUT) d += 10;
            if (d < bestD) { best = p; bestD = d; }
        }
        return best;
    }

    static String mine(Player who, DuskEngine engine, String arg) {
        String key = who.strName.toLowerCase();
        if (arg.equals("stop")) {
            Dig d;
            synchronized (digging) { d = digging.remove(key); }
            if (d == null) return "You aren't mining.";
            if (browser(who)) tell(who, "Mining: done");
            return "You stop mining.";
        }
        synchronized (digging) {
            if (digging.containsKey(key)) return "You're already mining. (Move, or type: mine stop.)";
        }
        Prop vein = null;
        if (Storage.isNumber(arg)) {
            DuskObject o;
            try {
                o = engine.getDuskObject(Integer.parseInt(arg));
            } catch (Exception e) {
                o = null;
            }
            if (veinKind(o) == null) return "That isn't something you can mine.";
            vein = (Prop) o;
            if (Math.abs(vein.intLocX - who.intLocX) > VEIN_REACH || Math.abs(vein.intLocY - who.intLocY) > VEIN_REACH) return "Stand next to the " + Talk.bare(vein.strName) + " to mine it.";
        } else {
            vein = nearestVein(engine, who);
            if (vein == null) return "There's nothing to mine here. Stand next to an ore vein and type: mine";
        }
        Object[] kind = veinKind(vein);
        String name = Talk.bare(vein.strName);
        if (who.batBattle != null) return "Not while you're fighting.";
        if (!has(who, PICK)) return "You need a mining pick to mine. Smiths and the Izaru Mine Shop sell them.";
        int need = (Integer) kind[2];
        if (who.getSkill("Mining") < need) return "You need Mining " + need + " to work " + a(name) + ". (You have " + who.getSkill("Mining") + ".)";
        if (vein.intImage == WORKED_OUT) return "This " + name + " is worked out for now. It will fill again in a few minutes.";
        Dig d = new Dig();
        d.who = who;
        d.vein = vein;
        d.kind = kind;
        d.x = who.intLocX;
        d.y = who.intLocY;
        long swing = swingMs(who);
        d.swingEnds = System.currentTimeMillis() + swing;
        synchronized (digging) { digging.put(key, d); }
        if (browser(who)) tell(who, "Mining: " + swing + "|" + name);
        return "You start mining the " + name + ". (Move away, or type mine stop, to stop.)";
    }

    static long swingMs(LivingThing who) {
        return Math.max(2500, 4500 - who.getSkill("Mining") * 20L);
    }

    // One swing done: maybe some ore. Returns false when the digging ends.
    static boolean swing(DuskEngine engine, Dig d) {
        Player who = d.who;
        String name = Talk.bare(d.vein.strName);
        if (!who.blnWorking || !engine.vctSockets.contains(who)) return false;
        if (who.intLocX != d.x || who.intLocY != d.y) { tell(who, "You stop mining."); return false; }
        if (who.batBattle != null) { tell(who, "You stop mining to fight."); return false; }
        if (!has(who, PICK)) { tell(who, "You've no mining pick any more."); return false; }
        if (d.vein.intImage == WORKED_OUT || !engine.vctProps.contains(d.vein)) { tell(who, "The " + name + " is worked out."); return false; }
        Vein v = vein(d.vein);
        int level = who.getSkill("Mining"), need = (Integer) d.kind[2];
        double chance = Math.max(0.35, Math.min(0.95, 0.5 + (level - need) / 100.0));
        if (random.nextDouble() < chance) {
            String ore = (String) d.kind[1];
            Item it;
            try {
                it = engine.getItem(CaseFix.file("defItems", ore));
            } catch (Exception e) {
                it = null;
            }
            if (it == null) { Log.logError(new Exception("no item " + ore), "Crafting", false); return false; }
            if (!who.items.add(it)) { tell(who, "Your pack is full."); return false; }
            who.updateItems();
            tell(who, "You mine some " + ore + ".");
            gain(who, "Mining", "Mining", need);
            v.left--;
            if (v.left <= 0) {
                v.fullAgain = System.currentTimeMillis() + (4 + random.nextInt(5)) * 60000L;
                d.vein.intImage = WORKED_OUT;
                showImage(engine, d.vein);
                tell(who, "The " + name + " is worked out.");
                return false;
            }
        }
        return true;
    }

    static Vein vein(Prop p) {
        synchronized (veins) {
            Vein v = veins.get(p.ID);
            if (v == null) { v = new Vein(); veins.put(p.ID, v); }
            if (v.left < 0) v.left = 4 + random.nextInt(4);
            return v;
        }
    }

    static void tick(DuskEngine engine) {
        long now = System.currentTimeMillis();
        List<Dig> due = new ArrayList<Dig>();
        synchronized (digging) {
            for (Dig d : digging.values()) if (now >= d.swingEnds) due.add(d);
        }
        for (Dig d : due) {
            boolean more;
            try {
                more = swing(engine, d);
            } catch (Exception e) {
                Log.logError(e, "Crafting: mining for " + d.who.strName, false);
                more = false;
            }
            String key = d.who.strName.toLowerCase();
            if (more) {
                long ms = swingMs(d.who);
                d.swingEnds = now + ms;
                if (browser(d.who)) tell(d.who, "Mining: " + ms + "|" + Talk.bare(d.vein.strName));
            } else {
                synchronized (digging) { if (digging.get(key) == d) digging.remove(key); }
                if (browser(d.who)) tell(d.who, "Mining: done");
            }
        }
        // Worked-out veins filling again.
        List<Integer> full = new ArrayList<Integer>();
        synchronized (veins) {
            for (Map.Entry<Integer, Vein> e : veins.entrySet()) if (e.getValue().fullAgain > 0 && now >= e.getValue().fullAgain) full.add(e.getKey());
            for (Integer id : full) veins.remove(id);
        }
        for (Integer id : full) {
            try {
                DuskObject o = engine.getDuskObject(id);
                Object[] kind = veinKind(o);
                if (kind == null) continue;
                o.intImage = (Integer) kind[3];
                showImage(engine, o);
            } catch (Exception e) {
                Log.logError(e, "Crafting: refilling vein " + id, false);
            }
        }
    }

    // ---- skills ----

    // Now and then a point more: often at first, rarely near 100, and
    // hardly at all on work far below you.
    static void gain(LivingThing who, String skill, String shown, int workLevel) {
        int level = who.getSkill(skill);
        if (level >= 100) return;
        double chance = 0.05 + 0.5 * (100 - level) / 100.0;
        if (level > workLevel + 25) chance *= 0.2;
        if (random.nextDouble() >= chance) return;
        who.addToSkill(skill, 1);
        who.updateStats();
        tell(who, "Your " + shown + " skill rises to " + who.getSkill(skill) + ".");
    }

    // ---- smithing ----

    static class Recipe {
        String station, result;
        int level;
        List<String> items = new ArrayList<String>();
        List<Integer> counts = new ArrayList<Integer>();

        String needs() {
            StringBuilder b = new StringBuilder();
            for (int i = 0; i < items.size(); i++) b.append(i > 0 ? ", " : "").append(counts.get(i)).append(' ').append(items.get(i));
            return b.toString();
        }

        int canMake(LivingThing who) {
            int n = Integer.MAX_VALUE;
            for (int i = 0; i < items.size(); i++) n = Math.min(n, count(who, items.get(i)) / counts.get(i));
            return n == Integer.MAX_VALUE ? 0 : n;
        }
    }

    static List<Recipe> recipes = new ArrayList<Recipe>();
    static long recipesRead = -1;

    static synchronized List<Recipe> recipes() {
        File f = new File("recipes");
        long m = f.exists() ? f.lastModified() : 0;
        if (m == recipesRead) return recipes;
        List<Recipe> out = new ArrayList<Recipe>();
        try {
            if (m > 0) for (String line : Files.readAllLines(f.toPath())) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                String[] p = line.split("\\|");
                if (p.length != 4) continue;
                Recipe r = new Recipe();
                r.station = p[0].trim().toLowerCase();
                r.level = Integer.parseInt(p[1].trim());
                r.result = p[2].trim();
                for (String part : p[3].split(",")) {
                    String s = part.trim();
                    int sp = s.indexOf(' ');
                    if (sp > 0 && Storage.isNumber(s.substring(0, sp))) {
                        r.counts.add(Integer.parseInt(s.substring(0, sp)));
                        r.items.add(s.substring(sp + 1).trim());
                    } else if (s.length() > 0) {
                        r.counts.add(1);
                        r.items.add(s);
                    }
                }
                if (!r.items.isEmpty()) out.add(r);
            }
        } catch (Exception e) {
            Log.logError(e, "Crafting: reading recipes", false);
        }
        recipes = out;
        recipesRead = m;
        return out;
    }

    // The kinds of station (forge, anvil) within reach.
    static List<String> stations(DuskEngine engine, LivingThing who) {
        List<String> out = new ArrayList<String>();
        for (Object o : engine.vctProps.toArray()) {
            Prop p = (Prop) o;
            if (p == null || p.strName == null) continue;
            if (Math.abs(p.intLocX - who.intLocX) > STATION_REACH || Math.abs(p.intLocY - who.intLocY) > STATION_REACH) continue;
            String n = Talk.bare(p.strName).toLowerCase();
            for (String kind : new String[] { "forge", "anvil" }) if (n.matches(".*\\b" + kind + "\\b.*") && !out.contains(kind)) out.add(kind);
        }
        return out;
    }

    static String smith(Player who, DuskEngine engine, String arg) {
        List<String> here = stations(engine, who);
        if (here.isEmpty()) return "You need to stand by a forge (to smelt ore into bars) or an anvil (to make bars into gear).";
        if (arg.length() == 0) return list(who, here);
        // "smith <result> [n]"
        int n = 1;
        String what = arg;
        int sp = arg.lastIndexOf(' ');
        if (sp > 0 && Storage.isNumber(arg.substring(sp + 1))) {
            n = Math.max(1, Math.min(MAX_MAKE, Integer.parseInt(arg.substring(sp + 1))));
            what = arg.substring(0, sp).trim();
        }
        Recipe r = null;
        for (Recipe x : recipes()) if (x.result.equalsIgnoreCase(what) && here.contains(x.station)) r = x;
        if (r == null) {
            for (Recipe x : recipes()) if (x.result.equalsIgnoreCase(what)) return (x.result.endsWith("s") ? "" : "The ") + x.result + (x.result.endsWith("s") ? " are" : " is") + " made at " + (x.station.equals("anvil") ? "an anvil" : "a forge") + ".";
            return "Nothing called " + what + " is made here. Type smith to see what is.";
        }
        if (who.batBattle != null) return "Not while you're fighting.";
        int level = who.getSkill("Smithing");
        if (level < r.level) return "You need Smithing " + r.level + " to make " + a(r.result) + ". (You have " + level + ".)";
        if (r.station.equals("anvil") && !has(who, HAMMER)) return "You need a smithing hammer to work at the anvil. Smiths sell them.";
        int can = r.canMake(who);
        if (can == 0) return "To make " + a(r.result) + " you need " + r.needs() + ".";
        n = Math.min(n, can);
        Item made;
        try {
            made = engine.getItem(CaseFix.file("defItems", r.result));
        } catch (Exception e) {
            made = null;
        }
        if (made == null) return "The " + r.result + " can't be made just now (a god should look at the recipes).";
        int done = 0;
        for (int k = 0; k < n; k++) {
            for (int i = 0; i < r.items.size(); i++) for (int c = 0; c < r.counts.get(i); c++) who.items.remove(r.items.get(i), 0);
            Item it = k == 0 ? made : null;
            if (it == null) {
                try {
                    it = engine.getItem(CaseFix.file("defItems", r.result));
                } catch (Exception e) {
                    it = null;
                }
            }
            if (it == null || !who.items.add(it)) {
                // Full: give the materials of this one back.
                for (int i = 0; i < r.items.size(); i++) for (int c = 0; c < r.counts.get(i); c++) {
                    try {
                        who.items.add((Object) engine.getItem(CaseFix.file("defItems", r.items.get(i))));
                    } catch (Exception e) {
                        Log.logError(e, "Crafting: giving back " + r.items.get(i), false);
                    }
                }
                tell(who, "Your pack is full.");
                break;
            }
            done++;
            gain(who, "Smithing", "Smithing", r.level);
        }
        who.updateItems();
        try {
            who.savePlayer();
        } catch (Exception e) {
            // Saved on the next tick.
        }
        if (done == 0) return "";
        Log.logEvent(who.strName + " made " + done + " " + r.result);
        return "You " + (r.station.equals("forge") ? "smelt " : "make ") + many(done, r.result) + ".";
    }

    static String list(Player who, List<String> here) {
        int level = who.getSkill("Smithing");
        boolean b = browser(who);
        // (One line at a time: the old protocol takes no line breaks.)
        if (!b) tell(who, "Here you can make (your Smithing is " + level + "):");
        for (Recipe r : recipes()) {
            if (!here.contains(r.station)) continue;
            int can = r.canMake(who);
            if (b) tell(who, "Recipe: " + r.station + "|" + r.level + "|" + r.result + "|" + r.needs() + "|" + can);
            else tell(who, "  " + r.result + " (Smithing " + r.level + "): " + r.needs() + (level < r.level ? "" : can > 0 ? " - you can make " + can : ""));
        }
        if (b) {
            StringBuilder s = new StringBuilder();
            for (String h : here) s.append(s.length() > 0 ? "," : "").append(h);
            return "Recipes: " + s + "|" + level;
        }
        return "Type: smith <name> [how many]";
    }

    // ---- commands ----

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        String lower = t.toLowerCase();
        boolean isMine = lower.equals("mine") || lower.startsWith("mine ");
        boolean isSmith = lower.equals("smith") || lower.startsWith("smith ");
        if (!isMine && !isSmith) return null;
        if (!(who instanceof Player)) return null;
        try {
            if (isMine) return mine((Player) who, engine, lower.substring(4).trim());
            return smith((Player) who, engine, t.substring(5).trim());
        } catch (Exception e) {
            Log.logError(e, "Crafting \"" + t + "\" by " + who.strName, false);
            return "Something went wrong.";
        }
    }

    public static void start(final DuskEngine engine) {
        Thread th = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        Thread.sleep(TICK);
                        tick(engine);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Crafting tick", false);
                    }
                }
            }
        }, "Crafting");
        th.setDaemon(true);
        th.start();
    }
}
