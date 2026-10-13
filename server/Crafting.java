/*
 * Gathering and making: mining, herbalism, smithing and alchemy.
 *
 * Gathering: ore veins and herb patches are props (SOURCES: "iron vein",
 * "mandrake patch"...). Standing next to one with the right tool in your
 * pack (a mining pick, a herb sickle), "mine" or "gather" works it every
 * few seconds until you move, fight, it's used up or you type "mine stop"
 * ("gather stop"). Each go may give one of what it holds. A source holds a
 * few, then shows as used up (its empty image only: its name stays, so a
 * god's save never writes it down changed) and fills again some minutes
 * later.
 *
 * Trees are map squares, not props: "chop" (with a woodcutter's axe) works
 * a tree square beside you the same way, its logs by how far out it grows
 * (TREES: oak near the ferry landings, then ash, yew, and elderwood far
 * out). A tree gives a few logs, then has none for some minutes; nothing
 * on the map changes.
 *
 * Making: by a forge ore is smelted into bars; by an anvil, with a
 * smithing hammer, bars are made into gear; by an alchemy table, herbs are
 * brewed into potions; by a workbench, with a fletching knife, logs are
 * made into staves and bows (STATIONS). What can be made is in the game's
 * "recipes" file, one per line:
 *
 *   station|level|result|ingredient, ingredient...
 *   forge|0|bronze bar|2 bronze ore
 *   anvil|0|bronze sword|3 bronze bar
 *   alchemy|25|brewed red potion|1 mandrake, 1 wolfsbane
 *
 * read again whenever it changes. "level" is the skill needed (Smithing
 * for forge and anvil, Alchemy for the table).
 *
 * Mining, Herbalism, Smithing and Alchemy are skills (0-100, kept and
 * shown like any other), which rise now and then with use, slower as they
 * get higher and much slower on work far below them.
 *
 *   mine [<id>] | gather [<id>]    start (the nearest, or that one)
 *   chop [<x> <y>]                 start on a tree beside you (or that one)
 *   mine stop | gather stop | chop stop
 *   smith | brew | fletch          what you can make here
 *   smith|brew|fletch <result> [n] make it (n at once, up to 20)
 *
 * Gods (the God tab's Crafting window, js/craftadmin.js):
 *   craft status             "CraftStatus: <source>|<placed>|<used up>" for
 *                            each kind, "CraftStatus: working|<n>", then
 *                            "CraftStatus: done"
 *   craft refill             every used-up source full again, now
 *   craft recipes            "CraftRecipes: <base64 of the recipes file>"
 *   craft recipes set <b64>  checks every line (station, level, items that
 *                            exist), keeps the old file in backups/, saves
 *
 * Every reply is plain one-line words, so the old Java client can play too
 * (its protocol takes no line breaks: each extra line would be read as a
 * new message). The browser client also gets lines it reads and hides
 * (only it is sent them, through the bridge): "Working: <ms>|<what>" as
 * each go starts and "Working: done" at the end (a progress bar), and for
 * "smith" or "brew" one "Recipe: station|level|result|ingredients|how many
 * you can make" per recipe, then "Recipes: <station,station>|<skill>" (the
 * making window).
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
    // A thing to gather from: the prop's name, what it gives, the skill and
    // level it needs, its image when full and used up, the tool, and the
    // command that works it.
    static class Source {
        final String name, item, skill;
        final int level, image, empty;
        final String tool, command;

        Source(String name, String item, String skill, int level, int image, int empty, String tool, String command) {
            this.name = name; this.item = item; this.skill = skill; this.level = level;
            this.image = image; this.empty = empty; this.tool = tool; this.command = command;
        }

        boolean mining() { return command.equals("mine"); }
        boolean tree() { return command.equals("chop"); }
    }

    static final int WORKED_OUT = 62, PICKED = 71;
    static final String PICK = "mining pick", HAMMER = "smithing hammer", SICKLE = "herb sickle";
    static final Source[] SOURCES = {
        new Source("bronze vein", "bronze ore", "Mining", 0, 58, WORKED_OUT, PICK, "mine"),
        new Source("iron vein", "iron ore", "Mining", 15, 59, WORKED_OUT, PICK, "mine"),
        new Source("coal seam", "coal", "Mining", 30, 60, WORKED_OUT, PICK, "mine"),
        new Source("mithril vein", "mithril ore", "Mining", 60, 61, WORKED_OUT, PICK, "mine"),
        new Source("mushroom patch", "mushroom", "Herbalism", 0, 65, PICKED, SICKLE, "gather"),
        new Source("mandrake patch", "mandrake", "Herbalism", 10, 66, PICKED, SICKLE, "gather"),
        new Source("lavender patch", "lavendar", "Herbalism", 20, 67, PICKED, SICKLE, "gather"),
        new Source("wolfsbane patch", "wolfsbane", "Herbalism", 35, 68, PICKED, SICKLE, "gather"),
        new Source("azeala bush", "azeala", "Herbalism", 50, 69, PICKED, SICKLE, "gather"),
        new Source("moonpetal patch", "moonpetal", "Herbalism", 65, 70, PICKED, SICKLE, "gather"),
    };
    // Trees, by tier (how far out they grow, as veins and herb patches are
    // placed: tools/world/veins.mjs): one log each.
    static final String AXE = "woodcutter's axe", KNIFE = "fletching knife";
    static final Source[] TREES = {
        new Source("oak tree", "oak log", "Woodcutting", 0, -1, -1, AXE, "chop"),
        new Source("ash tree", "ash log", "Woodcutting", 15, -1, -1, AXE, "chop"),
        new Source("yew tree", "yew log", "Woodcutting", 35, -1, -1, AXE, "chop"),
        new Source("elderwood tree", "elderwood log", "Woodcutting", 60, -1, -1, AXE, "chop"),
    };
    // The map's tree squares (as js/trees.js: oak, autumn, gold, palm, willow).
    static final int[] TREE_TILES = { 64, 103, 25, 26, 102, 124, 171 };

    static boolean treeTile(DuskEngine engine, int x, int y) {
        try {
            int t = engine.shrMap[x][y];
            for (int k : TREE_TILES) if (k == t) return true;
        } catch (Exception e) {
            // Off the map.
        }
        return false;
    }

    // The ferry landings and the four home cities (Kingshaven, Velkarath,
    // Ssarakh, Aelindor): how far out a place is counts from the nearest.
    static final int[][] HOMES = { { 444, 1184 }, { 1691, 1303 }, { 1440, 352 }, { 1345, 912 }, { 1695, 943 }, { 457, 1233 } };

    // Which tree a square is: by how far it is from the nearest landing or
    // home city (the old world from the human start, and never past yew there).
    static Source treeAt(int x, int y) {
        int tier;
        if (x < 1000 && y < 1000) {
            double d = Math.hypot(x - 125, y - 365);
            tier = d < 250 ? 1 : d < 500 ? 2 : 3;
        } else {
            // From the nearest landing or home city (as tools/world/veins.mjs).
            double d = Double.MAX_VALUE;
            for (int[] h : HOMES) d = Math.min(d, Math.hypot(x - h[0], y - h[1]));
            tier = d < 220 ? 1 : d < 450 ? 2 : d < 750 ? 3 : 4;
        }
        return TREES[tier - 1];
    }

    // A tree square's key among the stores (props use their IDs, which are
    // never negative).
    static int treeKey(int x, int y) {
        return -(x * 4096 + y) - 1;
    }

    // A place to make things: the recipe file's station, the word in the
    // prop's name, the skill, the tool needed (or null), and what making
    // there is called.
    static final String[][] STATIONS = {
        { "forge", "forge", "Smithing", null, "smelt" },
        { "anvil", "anvil", "Smithing", HAMMER, "make" },
        { "alchemy", "alchemy table", "Alchemy", null, "brew" },
        { "fletching", "workbench", "Fletching", KNIFE, "fletch" },
    };
    static final long TICK = 250;
    static final int STATION_REACH = 2, SOURCE_REACH = 1, MAX_MAKE = 20;
    static final Random random = new Random();

    // ---- gathering ----

    static class Store {
        int left = -1;       // how many left; -1 until first worked
        long fullAgain = 0;  // when a used-up one fills again
    }

    static class Work {
        Player who;
        Prop prop;      // a vein or patch; null for a tree
        int tx, ty;     // the tree's square
        Source source;
        int x, y;
        long goEnds;

        int key() { return prop != null ? prop.ID : treeKey(tx, ty); }
    }

    static final Map<Integer, Store> stores = new HashMap<Integer, Store>();
    static final Map<String, Work> working = new HashMap<String, Work>();

    static Source sourceOf(DuskObject o) {
        if (!(o instanceof Prop) || o.strName == null) return null;
        String n = Talk.bare(o.strName).toLowerCase();
        for (Source s : SOURCES) if (n.equals(s.name)) return s;
        return null;
    }

    static boolean usedUp(DuskObject o, Source s) {
        return o.intImage == s.empty;
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

    // What a go is called, for the browser's bar: "Mining the iron vein".
    static String doing(Source s) {
        return s.mining() ? "Mining the " + s.name : s.tree() ? "Chopping the " + s.name : "Gathering " + s.item;
    }

    static String usedUpWords(Source s) {
        return s.mining() ? "is worked out" : s.tree() ? "has no good wood left" : "is picked bare";
    }

    static String verbing(Source s) {
        return s.mining() ? "mining" : s.tree() ? "chopping" : "gathering";
    }

    // A tree with no logs left for now.
    static boolean treeBare(int key) {
        synchronized (stores) {
            Store st = stores.get(key);
            return st != null && st.fullAgain > 0;
        }
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

    // The nearest source within reach that this command works (mine: veins,
    // gather: patches), a full one before a used-up one.
    static Prop nearest(DuskEngine engine, LivingThing who, String command) {
        Prop best = null;
        int bestD = Integer.MAX_VALUE;
        for (Object o : engine.vctProps.toArray()) {
            Prop p = (Prop) o;
            Source s = p == null ? null : sourceOf(p);
            if (s == null || !s.command.equals(command)) continue;
            int d = Math.max(Math.abs(p.intLocX - who.intLocX), Math.abs(p.intLocY - who.intLocY));
            if (d > SOURCE_REACH) continue;
            if (usedUp(p, s)) d += 10;
            if (d < bestD) { best = p; bestD = d; }
        }
        return best;
    }

    static String gather(Player who, DuskEngine engine, String command, String arg) {
        String key = who.strName.toLowerCase();
        String verb = command.equals("mine") ? "mining" : command.equals("chop") ? "chopping" : "gathering";
        if (arg.equals("stop")) {
            Work w;
            synchronized (working) { w = working.remove(key); }
            if (w == null) return "You aren't " + verb + ".";
            if (browser(who)) tell(who, "Working: done");
            return "You stop " + verbing(w.source) + ".";
        }
        synchronized (working) {
            Work w = working.get(key);
            if (w != null) return "You're already " + verbing(w.source) + ". (Move, or type: " + w.source.command + " stop.)";
        }
        if (command.equals("chop")) return chop(who, engine, arg);
        Prop prop;
        if (Storage.isNumber(arg)) {
            DuskObject o;
            try {
                o = engine.getDuskObject(Integer.parseInt(arg));
            } catch (Exception e) {
                o = null;
            }
            Source s = sourceOf(o);
            if (s == null || !s.command.equals(command)) return command.equals("mine") ? "That isn't something you can mine." : "That isn't something you can gather from.";
            prop = (Prop) o;
            if (Math.abs(prop.intLocX - who.intLocX) > SOURCE_REACH || Math.abs(prop.intLocY - who.intLocY) > SOURCE_REACH) return "Stand next to the " + Talk.bare(prop.strName) + " first.";
        } else {
            prop = nearest(engine, who, command);
            if (prop == null) return command.equals("mine") ? "There's nothing to mine here. Stand next to an ore vein and type: mine"
                : "There's nothing to gather here. Stand next to a patch of herbs and type: gather";
        }
        Source s = sourceOf(prop);
        if (who.batBattle != null) return "Not while you're fighting.";
        if (!has(who, s.tool)) return s.mining() ? "You need a mining pick to mine. Smiths and the Izaru Mine Shop sell them."
            : "You need a herb sickle to gather herbs. Alchemists and the stalls by the forges sell them.";
        if (who.getSkill(s.skill) < s.level) return "You need " + s.skill + " " + s.level + " to work " + a(s.name) + ". (You have " + who.getSkill(s.skill) + ".)";
        if (usedUp(prop, s)) return "This " + s.name + " " + usedUpWords(s) + " for now. It will " + (s.mining() ? "fill" : "grow") + " again in a few minutes.";
        Work w = new Work();
        w.who = who;
        w.prop = prop;
        w.source = s;
        w.x = who.intLocX;
        w.y = who.intLocY;
        long ms = goMs(who, s);
        w.goEnds = System.currentTimeMillis() + ms;
        synchronized (working) { working.put(key, w); }
        if (browser(who)) tell(who, "Working: " + ms + "|" + doing(s));
        return "You start " + verb + (s.mining() ? " the " + s.name : " at the " + s.name) + ". (Move away, or type " + command + " stop, to stop.)";
    }

    // "chop [x y]": the tree square given, or one beside you.
    static String chop(Player who, DuskEngine engine, String arg) {
        int tx = -1, ty = -1;
        String[] a = arg.split("\\s+");
        if (a.length == 2 && Storage.isNumber(a[0]) && Storage.isNumber(a[1])) {
            tx = Integer.parseInt(a[0]);
            ty = Integer.parseInt(a[1]);
            if (Math.abs(tx - who.intLocX) > SOURCE_REACH || Math.abs(ty - who.intLocY) > SOURCE_REACH) return "Stand next to the tree first.";
            if (!treeTile(engine, tx, ty)) return "That isn't a tree.";
        } else {
            // A tree beside you with wood in it before a bare one.
            for (int pass = 0; pass < 2 && tx < 0; pass++)
                for (int dx = -1; dx <= 1 && tx < 0; dx++)
                    for (int dy = -1; dy <= 1 && tx < 0; dy++) {
                        int x = who.intLocX + dx, y = who.intLocY + dy;
                        if ((dx != 0 || dy != 0) && treeTile(engine, x, y) && (pass == 1 || !treeBare(treeKey(x, y)))) { tx = x; ty = y; }
                    }
            if (tx < 0) return "There's no tree here. Stand next to one and type: chop";
        }
        Source s = treeAt(tx, ty);
        if (who.batBattle != null) return "Not while you're fighting.";
        if (!has(who, s.tool)) return "You need a woodcutter's axe to chop trees. Smiths, bowyers and the stalls by the forges sell them.";
        if (who.getSkill(s.skill) < s.level) return "You need " + s.skill + " " + s.level + " to chop " + a(s.name) + ". (You have " + who.getSkill(s.skill) + ".)";
        if (treeBare(treeKey(tx, ty))) return "This " + s.name + " has no good wood left for now. Try another, or come back in a few minutes.";
        Work w = new Work();
        w.who = who;
        w.tx = tx;
        w.ty = ty;
        w.source = s;
        w.x = who.intLocX;
        w.y = who.intLocY;
        long ms = goMs(who, s);
        w.goEnds = System.currentTimeMillis() + ms;
        synchronized (working) { working.put(who.strName.toLowerCase(), w); }
        if (browser(who)) tell(who, "Working: " + ms + "|" + doing(s));
        return "You start chopping the " + s.name + ". (Move away, or type chop stop, to stop.)";
    }

    static long goMs(LivingThing who, Source s) {
        return Math.max(2500, 4500 - who.getSkill(s.skill) * 20L);
    }

    // One go done: maybe something. Returns false when the work ends.
    static boolean go(DuskEngine engine, Work w) {
        Player who = w.who;
        Source s = w.source;
        if (!who.blnWorking || !engine.vctSockets.contains(who)) return false;
        if (who.intLocX != w.x || who.intLocY != w.y) { tell(who, "You stop " + verbing(s) + "."); return false; }
        if (who.batBattle != null) { tell(who, "You stop to fight."); return false; }
        if (!has(who, s.tool)) { tell(who, "You've no " + s.tool + " any more."); return false; }
        boolean gone = w.prop != null ? usedUp(w.prop, s) || !engine.vctProps.contains(w.prop) : treeBare(w.key());
        if (gone) { tell(who, "The " + s.name + " " + usedUpWords(s) + "."); return false; }
        Store st = store(w.key());
        int level = who.getSkill(s.skill);
        double chance = Math.max(0.35, Math.min(0.95, 0.5 + (level - s.level) / 100.0));
        if (random.nextDouble() < chance) {
            Item it;
            try {
                it = engine.getItem(CaseFix.file("defItems", s.item));
            } catch (Exception e) {
                it = null;
            }
            if (it == null) { Log.logError(new Exception("no item " + s.item), "Crafting", false); return false; }
            if (!who.items.add(it)) { tell(who, "Your pack is full."); return false; }
            who.updateItems();
            tell(who, s.tree() ? "You chop " + a(s.item) + "." : "You " + (s.mining() ? "mine" : "gather") + " some " + s.item + ".");
            gain(who, s.skill, s.level);
            st.left--;
            if (st.left <= 0) {
                st.fullAgain = System.currentTimeMillis() + (4 + random.nextInt(5)) * 60000L;
                if (w.prop != null) {
                    w.prop.intImage = s.empty;
                    showImage(engine, w.prop);
                }
                tell(who, "The " + s.name + " " + usedUpWords(s) + ".");
                return false;
            }
        }
        return true;
    }

    static Store store(int key) {
        synchronized (stores) {
            Store st = stores.get(key);
            if (st == null) { st = new Store(); stores.put(key, st); }
            if (st.left < 0) st.left = 4 + random.nextInt(4);
            return st;
        }
    }

    static void tick(DuskEngine engine) {
        long now = System.currentTimeMillis();
        List<Work> due = new ArrayList<Work>();
        synchronized (working) {
            for (Work w : working.values()) if (now >= w.goEnds) due.add(w);
        }
        for (Work w : due) {
            boolean more;
            try {
                more = go(engine, w);
            } catch (Exception e) {
                Log.logError(e, "Crafting: " + w.source.name + " for " + w.who.strName, false);
                more = false;
            }
            String key = w.who.strName.toLowerCase();
            if (more) {
                long ms = goMs(w.who, w.source);
                w.goEnds = now + ms;
                if (browser(w.who)) tell(w.who, "Working: " + ms + "|" + doing(w.source));
            } else {
                synchronized (working) { if (working.get(key) == w) working.remove(key); }
                if (browser(w.who)) tell(w.who, "Working: done");
            }
        }
        // Used-up sources filling again.
        List<Integer> full = new ArrayList<Integer>();
        synchronized (stores) {
            for (Map.Entry<Integer, Store> e : stores.entrySet()) if (e.getValue().fullAgain > 0 && now >= e.getValue().fullAgain) full.add(e.getKey());
            for (Integer id : full) stores.remove(id);
        }
        for (Integer id : full) {
            if (id < 0) continue; // a tree: nothing to show
            try {
                DuskObject o = engine.getDuskObject(id);
                Source s = sourceOf(o);
                if (s == null) continue;
                o.intImage = s.image;
                showImage(engine, o);
            } catch (Exception e) {
                Log.logError(e, "Crafting: refilling " + id, false);
            }
        }
    }

    // ---- skills ----

    // Now and then a point more: often at first, rarely near 100, and
    // hardly at all on work far below you.
    static void gain(LivingThing who, String skill, int workLevel) {
        int level = who.getSkill(skill);
        if (level >= 100) return;
        double chance = 0.05 + 0.5 * (100 - level) / 100.0;
        if (level > workLevel + 25) chance *= 0.2;
        if (random.nextDouble() >= chance) return;
        who.addToSkill(skill, 1);
        who.updateStats();
        tell(who, "Your " + skill + " skill rises to " + who.getSkill(skill) + ".");
    }

    // ---- making ----

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

    static String[] station(String kind) {
        for (String[] s : STATIONS) if (s[0].equals(kind)) return s;
        return null;
    }

    // The stations this command uses: smith -> forge, anvil; brew ->
    // alchemy; fletch -> fletching.
    static boolean usedBy(String command, String kind) {
        if (command.equals("brew")) return kind.equals("alchemy");
        if (command.equals("fletch")) return kind.equals("fletching");
        return kind.equals("forge") || kind.equals("anvil");
    }

    // The kinds of station within reach that this command uses.
    static List<String> stations(DuskEngine engine, LivingThing who, String command) {
        List<String> out = new ArrayList<String>();
        for (Object o : engine.vctProps.toArray()) {
            Prop p = (Prop) o;
            if (p == null || p.strName == null) continue;
            if (Math.abs(p.intLocX - who.intLocX) > STATION_REACH || Math.abs(p.intLocY - who.intLocY) > STATION_REACH) continue;
            String n = Talk.bare(p.strName).toLowerCase();
            for (String[] s : STATIONS) if (usedBy(command, s[0]) && n.matches(".*\\b" + s[1] + "\\b.*") && !out.contains(s[0])) out.add(s[0]);
        }
        return out;
    }

    static String make(Player who, DuskEngine engine, String command, String arg) {
        List<String> here = stations(engine, who, command);
        if (here.isEmpty()) return command.equals("brew") ? "You need to stand by an alchemy table to brew."
            : command.equals("fletch") ? "You need to stand by a workbench to fletch."
            : "You need to stand by a forge (to smelt ore into bars) or an anvil (to make bars into gear).";
        String skill = command.equals("brew") ? "Alchemy" : command.equals("fletch") ? "Fletching" : "Smithing";
        if (arg.length() == 0) return list(who, here, skill, command);
        // "<command> <result> [n]"
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
            for (Recipe x : recipes()) if (x.result.equalsIgnoreCase(what)) {
                String[] st = station(x.station);
                String at = st == null ? x.station : st[1];
                return (x.result.endsWith("s") ? "" : "The ") + x.result + (x.result.endsWith("s") ? " are" : " is") + " made at " + a(at) + ".";
            }
            return "Nothing called " + what + " is made here. Type " + command + " to see what is.";
        }
        String[] st = station(r.station);
        String verb = st == null ? "make" : st[4];
        if (who.batBattle != null) return "Not while you're fighting.";
        int level = who.getSkill(skill);
        if (level < r.level) return "You need " + skill + " " + r.level + " to " + verb + " " + a(r.result) + ". (You have " + level + ".)";
        if (st != null && st[3] != null && !has(who, st[3])) return "You need " + a(st[3]) + " to work at the " + st[1] + ". " + (st[3].equals(KNIFE) ? "Bowyers and the stalls by the forges sell them." : "Smiths sell them.");
        int can = r.canMake(who);
        if (can == 0) return "To " + verb + " " + a(r.result) + " you need " + r.needs() + ".";
        n = Math.min(n, can);
        int done = 0;
        for (int k = 0; k < n; k++) {
            Item it;
            try {
                it = engine.getItem(CaseFix.file("defItems", r.result));
            } catch (Exception e) {
                it = null;
            }
            if (it == null) {
                if (done == 0) return "The " + r.result + " can't be made just now (a god should look at the recipes).";
                break;
            }
            for (int i = 0; i < r.items.size(); i++) for (int c = 0; c < r.counts.get(i); c++) who.items.remove(r.items.get(i), 0);
            if (!who.items.add(it)) {
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
            gain(who, skill, r.level);
        }
        who.updateItems();
        try {
            who.savePlayer();
        } catch (Exception e) {
            // Saved on the next tick.
        }
        if (done == 0) return "";
        Log.logEvent(who.strName + " made " + done + " " + r.result);
        return "You " + verb + " " + many(done, r.result) + ".";
    }

    static String list(Player who, List<String> here, String skill, String command) {
        int level = who.getSkill(skill);
        boolean b = browser(who);
        // (One line at a time: the old protocol takes no line breaks.)
        if (!b) tell(who, "Here you can make (your " + skill + " is " + level + "):");
        for (Recipe r : recipes()) {
            if (!here.contains(r.station)) continue;
            int can = r.canMake(who);
            if (b) tell(who, "Recipe: " + r.station + "|" + r.level + "|" + r.result + "|" + r.needs() + "|" + can);
            else tell(who, "  " + r.result + " (" + skill + " " + r.level + "): " + r.needs() + (level < r.level ? "" : can > 0 ? " - you can make " + can : ""));
        }
        if (b) {
            StringBuilder s = new StringBuilder();
            for (String h : here) s.append(s.length() > 0 ? "," : "").append(h);
            return "Recipes: " + s + "|" + level;
        }
        return "Type: " + command + " <name> [how many]";
    }

    // ---- gods ----

    static final int GOD_PRIVS = 3;

    static String god(LivingThing who, DuskEngine engine, String arg) throws Exception {
        if (who.privs < GOD_PRIVS) return "Only gods can do that.";
        String lower = arg.toLowerCase();
        if (lower.equals("status")) {
            Map<String, int[]> counts = new java.util.LinkedHashMap<String, int[]>();
            for (Source src : SOURCES) counts.put(src.name, new int[2]);
            for (Object o : engine.vctProps.toArray()) {
                Prop p = (Prop) o;
                Source src = p == null ? null : sourceOf(p);
                if (src == null) continue;
                int[] c = counts.get(src.name);
                c[0]++;
                if (usedUp(p, src)) c[1]++;
            }
            for (Map.Entry<String, int[]> e : counts.entrySet()) tell(who, "CraftStatus: " + e.getKey() + "|" + e.getValue()[0] + "|" + e.getValue()[1]);
            int n;
            synchronized (working) { n = working.size(); }
            tell(who, "CraftStatus: working|" + n);
            return "CraftStatus: done";
        }
        if (lower.equals("refill")) {
            int n = 0;
            for (Object o : engine.vctProps.toArray()) {
                Prop p = (Prop) o;
                Source src = p == null ? null : sourceOf(p);
                if (src == null || !usedUp(p, src)) continue;
                p.intImage = src.image;
                showImage(engine, p);
                n++;
            }
            synchronized (stores) { stores.clear(); }
            Log.logEvent(who.strName + " refilled " + n + " veins and patches");
            return "Refilled " + n + (n == 1 ? " vein or patch." : " veins and patches.");
        }
        if (lower.equals("recipes")) {
            File f = new File("recipes");
            byte[] data = f.exists() ? Files.readAllBytes(f.toPath()) : new byte[0];
            return "CraftRecipes: " + java.util.Base64.getEncoder().encodeToString(data);
        }
        if (lower.startsWith("recipes set ")) {
            String text = new String(java.util.Base64.getDecoder().decode(arg.substring(12).trim()), "UTF-8");
            List<String> bad = new ArrayList<String>();
            int good = 0, n = 0;
            for (String line : text.split("\n")) {
                n++;
                String t = line.trim();
                if (t.isEmpty() || t.startsWith("#")) continue;
                String[] p = t.split("\\|");
                String why = null;
                if (p.length != 4) why = "needs station|level|result|ingredients";
                else if (station(p[0].trim().toLowerCase()) == null) why = "no station called " + p[0].trim();
                else if (!p[1].trim().matches("\\d{1,3}") || Integer.parseInt(p[1].trim()) > 100) why = "the level should be 0-100";
                else if (!itemExists(p[2].trim())) why = "no item called " + p[2].trim();
                else {
                    for (String part : p[3].split(",")) {
                        String s2 = part.trim();
                        int sp = s2.indexOf(' ');
                        String item = sp > 0 && Storage.isNumber(s2.substring(0, sp)) ? s2.substring(sp + 1).trim() : s2;
                        if (item.isEmpty() || !itemExists(item)) { why = "no item called " + item; break; }
                    }
                }
                if (why != null) bad.add("line " + n + ": " + why);
                else good++;
            }
            if (!bad.isEmpty()) return "Recipes not saved: " + String.join("; ", bad.subList(0, Math.min(5, bad.size()))) + (bad.size() > 5 ? " (and " + (bad.size() - 5) + " more)" : "");
            File f = new File("recipes");
            if (f.exists()) {
                File keep = new File("backups", "recipes-" + new java.text.SimpleDateFormat("yyyyMMdd-HHmmss").format(new java.util.Date()));
                keep.getParentFile().mkdirs();
                Files.copy(f.toPath(), keep.toPath());
            }
            Talk.write(f, (text.endsWith("\n") ? text : text + "\n").getBytes("UTF-8"));
            Log.logEvent(who.strName + " saved the recipes (" + good + ")");
            return "Recipes saved: " + good + (good == 1 ? " recipe." : " recipes.");
        }
        return "Usage: craft status | craft refill | craft recipes";
    }

    static boolean itemExists(String name) {
        try {
            return new File("defItems", CaseFix.file("defItems", name)).isFile();
        } catch (Exception e) {
            return false;
        }
    }

    // ---- commands ----

    static boolean is(String lower, String command) {
        return lower.equals(command) || lower.startsWith(command + " ");
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        String lower = t.toLowerCase();
        String cmd = is(lower, "mine") ? "mine" : is(lower, "gather") ? "gather" : is(lower, "chop") ? "chop" : is(lower, "smith") ? "smith"
            : is(lower, "brew") ? "brew" : is(lower, "fletch") ? "fletch" : is(lower, "craft") ? "craft" : null;
        if (cmd == null || !(who instanceof Player)) return null;
        try {
            if (cmd.equals("craft")) return god(who, engine, t.substring(5).trim());
            if (cmd.equals("mine") || cmd.equals("gather") || cmd.equals("chop")) return gather((Player) who, engine, cmd, lower.substring(cmd.length()).trim());
            return make((Player) who, engine, cmd, t.substring(cmd.length()).trim());
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
