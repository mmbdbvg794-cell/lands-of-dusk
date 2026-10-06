/*
 * Quests made with the God tab's quest wizard (js/quests.js).
 *
 * The wizard writes each quest's conversations itself (talkedit) and its
 * journal lines (journal set); the server keeps the quest as the wizard
 * wrote it, counts kills for "kill" steps, and says who is on which step.
 *
 *   quest list                       (gods) "Quest: <id>|<title>" a line each, then "Quest: done"
 *   quest get <id>                   (gods) "QuestDef: <id>|<base64 of its json>"
 *   quest set <id>|<json>|<kills>[|<places>]
 *                                    (gods, base64) saves quests/<id>.json,
 *                                    quests/<id>.kills: a line per kill step,
 *                                    "flag|monster|count|next flag|what they are",
 *                                    and quests/<id>.places: a line per place
 *                                    step, "flag|x|y|radius|next flag|said on arriving"
 *   quest remove <id>                (gods) takes both out (backed up)
 *   quest who <id>                   (gods) "QuestWho: <id>|<player>|<flag>|<online 0/1>"
 *                                    for each player on one of its flags, then "QuestWho: done"
 *
 * Timed flags: the engine never counts a condition's duration down, so a
 * conversation's "again after N minutes" gives the player the hidden
 * condition timernow and then
 *   order trigger "flagtimer <flag> <minutes>"
 * which only works with timernow (players can't give it themselves), and
 * takes the flag away again when the time is up (checked every 30 seconds,
 * kept in the "flagtimers" file: player|flag|when, in ms).
 *
 * Kills: Battle shares out a killed monster's experience through
 * splitExp1/splitExp2 here (BattlePatch.java), so every player on the
 * winning side who holds a kill step's flag counts it. Counts are kept in
 * the "questkills" file (player|flag|count); at the goal the step's flag
 * gives way to the next one, whose journal line says what's next.
 *
 * Places: every 2 seconds, an online player who holds a place step's flag
 * and stands within its radius (squares either way) of x,y is told the
 * arriving line, and the flag gives way to the next one.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Vector;

public class Quests {
    static final int GOD_PRIVS = 3;
    static final String DIR = "quests";
    static final String KILLS = "questkills";
    static final int MAX_FILE = 200000;

    // A kill step: hold `flag`, kill `count` of `mob`, then `next`.
    static class Goal {
        String quest, flag, mob, next, what;
        int count;
    }

    // Lower-case flag -> its kill goal, from every quests/*.kills.
    static final Map<String, Goal> goals = new HashMap<String, Goal>();

    // A place step: hold `flag`, come within `radius` of x,y, then `next`.
    static class Place {
        String quest, flag, next, says;
        int x, y, radius;
    }

    // Lower-case flag -> its place, from every quests/*.places.
    static final Map<String, Place> places = new HashMap<String, Place>();
    static final long PLACE_MS = 2000, TIMER_MS = 30000;
    // "player|flag" (lower case) -> kills so far.
    static final Map<String, Integer> counts = new LinkedHashMap<String, Integer>();
    static boolean loaded = false;

    static final String TIMER_FLAG = "timernow";
    static final String TIMERS = "flagtimers";
    static final Map<String, Long> timers = new LinkedHashMap<String, Long>(); // "player|flag" -> when
    static boolean timersLoaded = false;

    public static void start(final DuskEngine engine) {
        try {
            File cond = new File("defConditions", TIMER_FLAG);
            if (!cond.exists()) Talk.write(cond, "nodisplay\n.\n".getBytes("UTF-8"));
        } catch (Exception e) {
            Log.logError(e, "Quests: making defConditions/" + TIMER_FLAG, false);
        }
        Thread t = new Thread(new Runnable() {
            public void run() {
                long lastTimers = System.currentTimeMillis();
                while (true) {
                    try {
                        Thread.sleep(PLACE_MS);
                        arrivals(engine);
                        if (System.currentTimeMillis() - lastTimers < TIMER_MS) continue;
                        lastTimers = System.currentTimeMillis();
                        expire(engine);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Flag timers", false);
                    }
                }
            }
        }, "FlagTimers");
        t.setDaemon(true);
        t.start();
    }

    static synchronized void loadTimers() {
        if (timersLoaded) return;
        timersLoaded = true;
        try {
            File f = new File(TIMERS);
            if (!f.isFile()) return;
            for (String line : Files.readAllLines(f.toPath())) {
                String[] p = line.split("\\|");
                if (p.length == 3) timers.put(p[0] + "|" + p[1], Long.parseLong(p[2].trim()));
            }
        } catch (Exception e) {
            Log.logError(e, "Reading flagtimers", false);
        }
    }

    static synchronized void saveTimers() {
        StringBuilder b = new StringBuilder();
        for (Map.Entry<String, Long> e : timers.entrySet()) b.append(e.getKey()).append('|').append(e.getValue()).append('\n');
        try {
            Talk.write(new File(TIMERS), b.toString().getBytes("UTF-8"));
        } catch (Exception e) {
            Log.logError(e, "Saving flagtimers", false);
        }
    }

    // Online players whose timed flags are due lose them.
    static void expire(DuskEngine engine) {
        long now = System.currentTimeMillis();
        List<Object> players;
        synchronized (engine.vctSockets) {
            players = new ArrayList<Object>(engine.vctSockets);
        }
        for (Object o : players) {
            if (!(o instanceof Player)) continue;
            Player p = (Player) o;
            if (p.strName == null) continue;
            String me = p.strName.toLowerCase() + "|";
            List<String> due = new ArrayList<String>();
            synchronized (Quests.class) {
                loadTimers();
                for (Map.Entry<String, Long> e : timers.entrySet()) if (e.getKey().startsWith(me) && e.getValue() <= now) due.add(e.getKey());
                for (String k : due) timers.remove(k);
                if (!due.isEmpty()) saveTimers();
            }
            for (String k : due) p.removeCondition(k.substring(me.length()));
        }
    }

    static String flagTimer(LivingThing who, String args) {
        if (!who.hasCondition(TIMER_FLAG)) return "";
        who.removeCondition(TIMER_FLAG);
        String[] p = args.trim().split("\\s+");
        if (p.length != 2 || !p[0].matches("[A-Za-z0-9_]{1,40}") || !p[1].matches("\\d{1,6}")) return "";
        long when = System.currentTimeMillis() + Long.parseLong(p[1]) * 60000L;
        synchronized (Quests.class) {
            loadTimers();
            timers.put(who.strName.toLowerCase() + "|" + p[0], when);
            saveTimers();
        }
        return "";
    }

    // A flag that's taken away at `when` (ms), as the conversations' timers
    // are (server/Housing.java: a rented house's key).
    public static void setTimer(String player, String flag, long when) {
        synchronized (Quests.class) {
            loadTimers();
            timers.put(player.toLowerCase() + "|" + flag, when);
            saveTimers();
        }
    }

    static boolean goodId(String id) {
        return id.matches("[a-z0-9_]{1,30}");
    }

    static synchronized void load() {
        if (loaded) return;
        loaded = true;
        goals.clear();
        places.clear();
        File[] files = new File(DIR).listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.getName().endsWith(".places")) loadPlaces(f);
                if (!f.getName().endsWith(".kills")) continue;
                String quest = f.getName().substring(0, f.getName().length() - 6);
                try {
                    for (String line : Files.readAllLines(f.toPath())) {
                        String[] p = line.split("\\|", -1);
                        if (p.length < 5) continue;
                        Goal g = new Goal();
                        g.quest = quest;
                        g.flag = p[0].trim();
                        g.mob = p[1].trim();
                        g.count = Math.max(1, Integer.parseInt(p[2].trim()));
                        g.next = p[3].trim();
                        g.what = p[4].trim();
                        if (g.flag.length() > 0 && g.mob.length() > 0) goals.put(g.flag.toLowerCase(), g);
                    }
                } catch (Exception e) {
                    Log.logError(e, "Quest kills " + f.getName(), false);
                }
            }
        }
        counts.clear();
        try {
            File f = new File(KILLS);
            if (f.isFile()) {
                for (String line : Files.readAllLines(f.toPath())) {
                    String[] p = line.split("\\|");
                    if (p.length == 3) counts.put(p[0] + "|" + p[1], Integer.parseInt(p[2].trim()));
                }
            }
        } catch (Exception e) {
            Log.logError(e, "Reading questkills", false);
        }
    }

    static void loadPlaces(File f) {
        String quest = f.getName().substring(0, f.getName().length() - 7);
        try {
            for (String line : Files.readAllLines(f.toPath())) {
                String[] p = line.split("\\|", -1);
                if (p.length < 6) continue;
                Place pl = new Place();
                pl.quest = quest;
                pl.flag = p[0].trim();
                pl.x = Integer.parseInt(p[1].trim());
                pl.y = Integer.parseInt(p[2].trim());
                pl.radius = Math.max(0, Math.min(20, Integer.parseInt(p[3].trim())));
                pl.next = p[4].trim();
                pl.says = p[5].trim();
                if (pl.flag.length() > 0) places.put(pl.flag.toLowerCase(), pl);
            }
        } catch (Exception e) {
            Log.logError(e, "Quest places " + f.getName(), false);
        }
    }

    // Online players standing where a place step of theirs is.
    static void arrivals(DuskEngine engine) {
        List<Place> all;
        synchronized (Quests.class) {
            load();
            if (places.isEmpty()) return;
            all = new ArrayList<Place>(places.values());
        }
        List<Object> players;
        synchronized (engine.vctSockets) {
            players = new ArrayList<Object>(engine.vctSockets);
        }
        for (Object o : players) {
            if (!(o instanceof Player)) continue;
            Player p = (Player) o;
            if (p.strName == null) continue;
            for (Place pl : all) {
                if (Math.abs(p.intLocX - pl.x) > pl.radius || Math.abs(p.intLocY - pl.y) > pl.radius) continue;
                if (!p.hasCondition(pl.flag)) continue;
                p.removeCondition(pl.flag);
                if (pl.next.length() > 0) {
                    Condition c = p.engGame.getCondition(pl.next);
                    if (c != null) p.addCondition(c);
                }
                if (pl.says.length() > 0) p.chatMessage(pl.says + "\n");
                p.chatMessage("Your journal has been updated.\n");
            }
        }
    }

    static synchronized void saveCounts() {
        StringBuilder b = new StringBuilder();
        for (Map.Entry<String, Integer> e : counts.entrySet()) b.append(e.getKey()).append('|').append(e.getValue()).append('\n');
        try {
            Talk.write(new File(KILLS), b.toString().getBytes("UTF-8"));
        } catch (Exception e) {
            Log.logError(e, "Saving questkills", false);
        }
    }

    // ---- kills (called by the patched Battle) ----

    public static void splitExp1(Battle battle, LivingThing killed) {
        battle.splitExp1(killed);
        killed(killed, battle.vctSide1);
    }

    public static void splitExp2(Battle battle, LivingThing killed) {
        battle.splitExp2(killed);
        killed(killed, battle.vctSide2);
    }

    static void killed(LivingThing killed, Vector side) {
        try {
            if (!(killed instanceof Mob) || side == null) return;
            load();
            if (goals.isEmpty()) return;
            List<Object> winners;
            synchronized (side) {
                winners = new ArrayList<Object>(side);
            }
            for (Object o : winners) {
                if (o instanceof Player) counted((Player) o, killed.strName);
            }
        } catch (Exception e) {
            Log.logError(e, "Quest kill", false);
        }
    }

    static void counted(Player p, String mob) {
        List<Goal> done = new ArrayList<Goal>();
        List<String> said = new ArrayList<String>();
        synchronized (Quests.class) {
            for (Goal g : goals.values()) {
                if (!g.mob.equalsIgnoreCase(mob) || !p.hasCondition(g.flag)) continue;
                String key = p.strName.toLowerCase() + "|" + g.flag.toLowerCase();
                int n = (counts.containsKey(key) ? counts.get(key) : 0) + 1;
                if (n >= g.count) {
                    counts.remove(key);
                    done.add(g);
                    said.add(cap(g.what) + ": " + g.count + " of " + g.count + ". Done!");
                } else {
                    counts.put(key, n);
                    said.add(cap(g.what) + ": " + n + " of " + g.count + ".");
                }
            }
            if (!said.isEmpty()) saveCounts();
        }
        for (String s : said) p.chatMessage(s + "\n");
        for (Goal g : done) {
            p.removeCondition(g.flag);
            if (g.next.length() > 0) {
                Condition c = p.engGame.getCondition(g.next);
                if (c != null) p.addCondition(c);
            }
            p.chatMessage("Your journal has been updated.\n");
        }
    }

    // How many of a kill step a player has, for the journal ("3 of 5").
    static synchronized String progress(LivingThing who, String flag) {
        load();
        Goal g = goals.get(flag.toLowerCase());
        if (g == null) return null;
        Integer n = counts.get(who.strName.toLowerCase() + "|" + flag.toLowerCase());
        return (n == null ? 0 : n) + " of " + g.count;
    }

    static String cap(String s) {
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    // ---- the commands ----

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        String lower = t.toLowerCase();
        if (lower.startsWith("flagtimer ")) return flagTimer(who, t.substring(10));
        if (!(lower.equals("quest") || lower.startsWith("quest "))) return null;
        if (who.privs < GOD_PRIVS) return null; // players' "quest" is left to the game
        String args = t.length() > 5 ? t.substring(6).trim() : "";
        String la = args.toLowerCase();
        try {
            if (la.equals("list")) {
                File[] files = new File(DIR).listFiles();
                if (files != null) {
                    java.util.Arrays.sort(files);
                    for (File f : files) {
                        if (!f.getName().endsWith(".json")) continue;
                        String id = f.getName().substring(0, f.getName().length() - 5);
                        who.chatMessage("Quest: " + id + "|" + titleOf(new String(Files.readAllBytes(f.toPath()), "UTF-8")) + "\n");
                    }
                }
                return "Quest: done";
            }
            if (la.startsWith("get ")) {
                String id = la.substring(4).trim();
                File f = new File(DIR, id + ".json");
                if (!goodId(id) || !f.isFile()) return "There's no quest called " + id + ".";
                return "QuestDef: " + id + "|" + Base64.getEncoder().encodeToString(Files.readAllBytes(f.toPath()));
            }
            if (la.startsWith("set ")) {
                String[] p = args.substring(4).trim().split("\\|", -1);
                if (p.length < 3) return "Usage: quest set <id>|<json>|<kills>[|<places>]";
                String id = p[0].trim().toLowerCase();
                if (!goodId(id)) return "Quest names are lower-case letters, numbers and _ (up to 30).";
                byte[] json = Base64.getDecoder().decode(p[1].trim()), kills = Base64.getDecoder().decode(p[2].trim());
                byte[] where = p.length > 3 ? Base64.getDecoder().decode(p[3].trim()) : new byte[0];
                if (json.length == 0 || json.length > MAX_FILE || kills.length > MAX_FILE || where.length > MAX_FILE) return "That quest is empty or too big.";
                new File(DIR).mkdirs();
                keep(id);
                Talk.write(new File(DIR, id + ".json"), json);
                Talk.write(new File(DIR, id + ".kills"), kills);
                Talk.write(new File(DIR, id + ".places"), where);
                synchronized (Quests.class) { loaded = false; }
                load();
                Log.logEvent(who.strName + " saved the quest " + id);
                return "QuestSaved: " + id;
            }
            if (la.startsWith("remove ")) {
                String id = la.substring(7).trim();
                if (!goodId(id) || !new File(DIR, id + ".json").isFile()) return "There's no quest called " + id + ".";
                keep(id);
                new File(DIR, id + ".json").delete();
                new File(DIR, id + ".kills").delete();
                new File(DIR, id + ".places").delete();
                synchronized (Quests.class) { loaded = false; }
                Log.logEvent(who.strName + " removed the quest " + id);
                return "QuestRemoved: " + id;
            }
            if (la.startsWith("who ")) return whoIsOn(who, engine, la.substring(4).trim());
            return "Quest: quest list | get <id> | set <id>|<json>|<kills>[|<places>] | remove <id> | who <id>";
        } catch (IllegalArgumentException e) {
            return "That didn't arrive in one piece; try again.";
        } catch (Exception e) {
            Log.logError(e, "Quest command by " + who.strName, false);
            return "That didn't work: " + e.getMessage();
        }
    }

    static void keep(String id) throws Exception {
        File dir = new File("backups/quests");
        dir.mkdirs();
        String stamp = new SimpleDateFormat("yyyyMMdd-HHmmss").format(new Date());
        for (String ext : new String[] { ".json", ".kills", ".places" }) {
            File f = new File(DIR, id + ext);
            if (f.isFile()) Files.copy(f.toPath(), new File(dir, id + "-" + stamp + ext).toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
    }

    // The quest's "title" from its json, without a json library.
    static String titleOf(String json) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"title\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"").matcher(json);
        return m.find() ? m.group(1).replace("\\\"", "\"").replace("|", "/") : "";
    }

    // The quest's flags (its "flags" list in the json).
    static List<String> flagsOf(String json) {
        List<String> out = new ArrayList<String>();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"flags\"\\s*:\\s*\\[([^\\]]*)\\]").matcher(json);
        if (!m.find()) return out;
        java.util.regex.Matcher f = java.util.regex.Pattern.compile("\"([A-Za-z0-9_]{1,40})\"").matcher(m.group(1));
        while (f.find()) out.add(f.group(1));
        return out;
    }

    static String whoIsOn(LivingThing who, DuskEngine engine, String id) throws Exception {
        File f = new File(DIR, id + ".json");
        if (!goodId(id) || !f.isFile()) return "There's no quest called " + id + ".";
        List<String> flags = flagsOf(new String(Files.readAllBytes(f.toPath()), "UTF-8"));
        Map<String, String> online = new HashMap<String, String>();
        List<Object> players;
        synchronized (engine.vctSockets) {
            players = new ArrayList<Object>(engine.vctSockets);
        }
        // Online players, from what they hold now.
        for (Object o : players) {
            if (!(o instanceof Player)) continue;
            Player p = (Player) o;
            if (p.strName == null) continue;
            online.put(p.strName.toLowerCase(), "");
            for (String flag : flags) {
                if (!p.hasCondition(flag)) continue;
                String prog = progress(p, flag);
                who.chatMessage("QuestWho: " + id + "|" + p.strName + "|" + flag + (prog == null ? "" : " (" + prog + ")") + "|1\n");
            }
        }
        // Everyone else, from their saved files.
        File[] users = new File("users").listFiles();
        if (users != null) {
            for (File u : users) {
                String name = u.getName();
                if (name.contains(".") || online.containsKey(name.toLowerCase())) continue;
                List<String> lines;
                try {
                    lines = Files.readAllLines(u.toPath(), java.nio.charset.StandardCharsets.ISO_8859_1);
                } catch (Exception e) {
                    continue;
                }
                for (int i = 0; i + 1 < lines.size(); i++) {
                    if (!lines.get(i).equals("condition")) continue;
                    String c = lines.get(i + 1).trim();
                    for (String flag : flags) {
                        if (!c.equalsIgnoreCase(flag)) continue;
                        Integer n;
                        synchronized (Quests.class) { load(); n = counts.get(name.toLowerCase() + "|" + flag.toLowerCase()); }
                        Goal g;
                        synchronized (Quests.class) { g = goals.get(flag.toLowerCase()); }
                        String prog = g == null ? "" : " (" + (n == null ? 0 : n) + " of " + g.count + ")";
                        who.chatMessage("QuestWho: " + id + "|" + name + "|" + flag + prog + "|0\n");
                    }
                }
            }
        }
        return "QuestWho: done";
    }
}
