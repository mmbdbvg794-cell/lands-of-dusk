/*
 * God controls for the God tab's Server panel, and the leaderboard.
 *
 *   restart [seconds]   (privs 5) tells everyone the server restarts in that
 *                       long (default 60, 10 to 600), again at 30, 10 and 5
 *                       seconds; then saves and closes every player, as the
 *                       engine's "shutdown" does, and exits with code 3, so
 *                       systemd (Restart=on-failure) starts it again in a
 *                       few seconds. The map is not saved (a restart never
 *                       writes over content installed since the start).
 *   restart cancel      (privs 5) calls it off.
 *   serverinfo          (gods) "ServerInfo: up|players|memory used|memory max|
 *                       errors today|restart in (or -)", then up to five
 *                       "ServerError: <line>" from today's log, newest last,
 *                       then "ServerInfo: done".
 *
 * The admin page (js/admin.js), gods only:
 *   admin players       "AdminPlayer: name|race|title|privs|x|y|hp|maxhp|exp|
 *                       online since (ms, 0 if not known)|address|hidden (1/0)"
 *                       for everyone in the game, then "AdminPlayers: done"
 *   admin bugs [n]      the latest n bug reports (default 20, at most 100),
 *                       oldest first, each "AdminBug: <URL-encoded text>",
 *                       then "AdminBugs: done|<reports in the file>"
 *   admin logins [n]    the latest n lines of logs/login_history.log
 *                       (default 30, at most 200): "AdminLogin: <line>",
 *                       then "AdminLogins: done"
 *   admin errors [n]    today's latest n error lines (default 30, at most
 *                       200): "AdminError: <line>", then
 *                       "AdminErrors: done|<errors today>"
 *
 * Profiles: with it, profiles.json (profile.html): every player on the
 * leaderboard's terms (no gods, no one hidden, some experience), by lower-case
 * name: { name, race, title, exp, maxhp, stats: { str, dex, con, int, wis },
 * gear: [ { slot, item } ], quests: [ finished quests' titles ],
 * achievements (server/Achievements.java), playtime, online }.
 *
 * Leaderboard: every 5 minutes, leaderboard.json in the game directory
 * (serve.py hands it out beside leaderboard.html): the top 50 players by
 * experience, from their saved files; gods, anyone with no experience yet,
 * and anyone named in the "leaderboard.hide" file (a name a line) left out.
 *
 *   { "updated": <ms>, "players": [ { "name", "race", "title", "exp",
 *     "maxhp", "stats" (str+dex+con+int+wis), "quests" (finished: flags
 *     ending in "done"), "playtime" (ms) } ] }
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.Set;

public class Admin {
    static final int GOD_PRIVS = 3, MASTER_PRIVS = 5;
    static final int EXIT_RESTART = 3;
    static final long BOARD_MS = 5 * 60 * 1000;
    static final String BOARD = "leaderboard.json", HIDE = "leaderboard.hide";
    static final long started = System.currentTimeMillis();
    static volatile long restartAt = 0; // when, or 0
    static volatile int restartRun = 0; // bumped to cancel a countdown

    public static void start(final DuskEngine engine) {
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        writeBoard();
                        Thread.sleep(BOARD_MS);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Leaderboard", false);
                        try { Thread.sleep(BOARD_MS); } catch (InterruptedException ie) { return; }
                    }
                }
            }
        }, "Leaderboard");
        t.setDaemon(true);
        t.start();
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String lower = line.trim().toLowerCase();
        if (lower.equals("serverinfo")) return who.privs >= GOD_PRIVS ? info(who) : null;
        if (lower.equals("admin") || lower.startsWith("admin ")) return who.privs >= GOD_PRIVS ? admin(who, engine, lower.substring(5).trim()) : null;
        if (!(lower.equals("restart") || lower.startsWith("restart "))) return null;
        if (who.privs < MASTER_PRIVS) return null;
        String arg = lower.length() > 7 ? lower.substring(8).trim() : "";
        if (arg.equals("cancel")) {
            if (restartAt == 0) return "No restart is coming.";
            restartRun++;
            restartAt = 0;
            engine.chatMessage("The restart is called off.");
            Log.logEvent(who.strName + " called off the restart.");
            return "Restart called off.";
        }
        int secs = 60;
        if (arg.length() > 0) {
            if (!arg.matches("\\d{1,4}")) return "Usage: restart [seconds] | restart cancel";
            secs = Math.max(10, Math.min(600, Integer.parseInt(arg)));
        }
        if (restartAt != 0) return "A restart is already coming, in " + ((restartAt - System.currentTimeMillis() + 999) / 1000) + " seconds (restart cancel to call it off).";
        Log.logEvent(who.strName + " restarts the server in " + secs + " seconds.");
        countdown(engine, secs);
        return "Restarting in " + secs + " seconds.";
    }

    static void countdown(final DuskEngine engine, final int secs) {
        final int run = ++restartRun;
        restartAt = System.currentTimeMillis() + secs * 1000L;
        Thread t = new Thread(new Runnable() {
            public void run() {
                try {
                    int left = secs;
                    say(engine, left);
                    int[] marks = { 300, 120, 60, 30, 10, 5 };
                    while (left > 0) {
                        int next = 0;
                        for (int m : marks) if (m < left) { next = m; break; }
                        Thread.sleep((left - next) * 1000L);
                        if (restartRun != run) return;
                        left = next;
                        if (left > 0) say(engine, left);
                    }
                    restartNow(engine);
                } catch (InterruptedException e) {
                    // left as it was
                } catch (Exception e) {
                    Log.logError(e, "Restart", false);
                }
            }
        }, "Restart");
        t.setDaemon(true);
        t.start();
    }

    static void say(DuskEngine engine, int secs) {
        String when = secs >= 60 && secs % 60 == 0 ? (secs / 60) + (secs == 60 ? " minute" : " minutes") : secs + " seconds";
        engine.chatMessage("The server restarts in " + when + ". It will be back a few seconds later.");
    }

    // As the engine's "shutdown": everyone is saved and closed, then out.
    static void restartNow(DuskEngine engine) {
        engine.chatMessage("The server is restarting now. Log in again in a few seconds.");
        Log.logEvent("Restarting the server.");
        List<Object> players;
        synchronized (engine.vctSockets) {
            players = new ArrayList<Object>(engine.vctSockets);
        }
        for (Object o : players) {
            if (!(o instanceof Player)) continue;
            Player p = (Player) o;
            try {
                p.savePlayer();
            } catch (Exception e) {
                Log.logError(e, "Saving " + p.strName + " for the restart", false);
            }
            try {
                p.close();
            } catch (Exception e) {
                // gone already
            }
        }
        System.exit(EXIT_RESTART);
    }

    static String info(LivingThing who) {
        Runtime rt = Runtime.getRuntime();
        long usedMb = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024), maxMb = rt.maxMemory() / (1024 * 1024);
        List<String> errors = new ArrayList<String>();
        int count = 0;
        try {
            File log = new File("logs/server-" + new SimpleDateFormat("yyyy-MM-dd").format(new Date()) + ".log");
            if (log.isFile()) {
                for (String l : Files.readAllLines(log.toPath(), StandardCharsets.ISO_8859_1)) {
                    if (!l.contains("Error") || l.contains("Broken pipe")) continue;
                    count++;
                    errors.add(l.length() > 200 ? l.substring(0, 200) + "..." : l);
                    if (errors.size() > 5) errors.remove(0);
                }
            }
        } catch (Exception e) {
            errors.add("(couldn't read today's log: " + e.getMessage() + ")");
        }
        int online = 0;
        DuskEngine engine = who.engGame;
        synchronized (engine.vctSockets) {
            for (Object o : engine.vctSockets) if (o instanceof Player && ((Player) o).strName != null) online++;
        }
        long at = restartAt;
        String restart = at == 0 ? "-" : String.valueOf(Math.max(0, (at - System.currentTimeMillis() + 999) / 1000));
        who.chatMessage("ServerInfo: " + (System.currentTimeMillis() - started) / 1000 + "|" + online + "|" + usedMb + "|" + maxMb + "|" + count + "|" + restart + "\n");
        for (String e : errors) who.chatMessage("ServerError: " + e.replace('\n', ' ') + "\n");
        return "ServerInfo: done";
    }

    // ---- the admin page ----

    static String admin(LivingThing who, DuskEngine engine, String arg) {
        String[] a = arg.split("\\s+");
        int n = 0;
        if (a.length > 1) {
            if (!a[1].matches("\\d{1,3}")) return "Usage: admin players | bugs [n] | logins [n] | errors [n]";
            n = Integer.parseInt(a[1]);
        }
        try {
            if (a[0].equals("players")) return players(who, engine);
            if (a[0].equals("bugs")) return bugs(who, n > 0 ? Math.min(n, 100) : 20);
            if (a[0].equals("logins")) return logins(who, n > 0 ? Math.min(n, 200) : 30);
            if (a[0].equals("errors")) return errors(who, n > 0 ? Math.min(n, 200) : 30);
        } catch (Exception e) {
            Log.logError(e, "Admin page: " + arg, false);
            return "Admin: that didn't work (" + e.getMessage() + ").";
        }
        return "Usage: admin players | bugs [n] | logins [n] | errors [n]";
    }

    static String field(Object o) {
        return o == null ? "" : String.valueOf(o).replace('|', '/').replace('\n', ' ');
    }

    static String players(LivingThing who, DuskEngine engine) {
        List<Object> all;
        synchronized (engine.vctSockets) {
            all = new ArrayList<Object>(engine.vctSockets);
        }
        for (Object o : all) {
            if (!(o instanceof Player)) continue;
            Player p = (Player) o;
            if (p.strName == null) continue;
            Long since = null;
            try { since = Who.since.get(p.strName.toLowerCase()); } catch (Exception e) { /* the Who thread is rewriting it */ }
            String address;
            try { address = Bans.addressOf(p); } catch (Exception e) { address = "?"; }
            who.chatMessage("AdminPlayer: " + field(p.strName) + "|" + field(p.strRace) + "|" + field(p.strTitle) + "|" + p.privs + "|"
                + p.intLocX + "|" + p.intLocY + "|" + p.attributes.getStat("hp") + "|" + p.attributes.getStat("maxhp") + "|" + p.exp + "|"
                + (since == null ? 0 : since) + "|" + field(address) + "|" + (p.wizInvis ? 1 : 0) + "\n");
        }
        return "AdminPlayers: done";
    }

    static String bugs(LivingThing who, int n) throws Exception {
        File f = new File(Mail.LOG);
        List<String> reports = new ArrayList<String>();
        if (f.isFile()) {
            String all = new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8);
            for (String r : all.split("(^|\n)==== ")) if (r.trim().length() > 0) reports.add(r.trim());
        }
        for (String r : reports.subList(Math.max(0, reports.size() - n), reports.size())) who.chatMessage("AdminBug: " + URLEncoder.encode(r, "UTF-8") + "\n");
        return "AdminBugs: done|" + reports.size();
    }

    static List<String> tail(File f, int n) throws Exception {
        if (!f.isFile()) return new ArrayList<String>();
        List<String> l = Files.readAllLines(f.toPath(), StandardCharsets.ISO_8859_1);
        return l.subList(Math.max(0, l.size() - n), l.size());
    }

    static String logins(LivingThing who, int n) throws Exception {
        for (String l : tail(new File("logs/login_history.log"), n)) if (l.trim().length() > 0) who.chatMessage("AdminLogin: " + l.trim() + "\n");
        return "AdminLogins: done";
    }

    static String errors(LivingThing who, int n) throws Exception {
        File log = new File("logs/server-" + new SimpleDateFormat("yyyy-MM-dd").format(new Date()) + ".log");
        List<String> errs = new ArrayList<String>();
        if (log.isFile()) for (String l : Files.readAllLines(log.toPath(), StandardCharsets.ISO_8859_1)) if (l.contains("Error") && !l.contains("Broken pipe")) errs.add(l.length() > 300 ? l.substring(0, 300) + "..." : l);
        for (String e : errs.subList(Math.max(0, errs.size() - n), errs.size())) who.chatMessage("AdminError: " + e + "\n");
        return "AdminErrors: done|" + errs.size();
    }

    // ---- the leaderboard ----

    static class Row {
        String name, race = "", title = "", cls = ""; // cls: the class's name (server/Classes.java)
        boolean female;
        long exp, playtime;
        int maxhp, stats, quests, privs;
        final Map<String, Integer> each = new LinkedHashMap<String, Integer>(); // stre... -> value
        final List<String[]> gear = new ArrayList<String[]>(); // { slot, item }
        final List<String> done = new ArrayList<String>(); // "_done" flags
    }
    // Worn gear in a users file: "<slot>2", then the item, durability, uses.
    static final String[][] SLOTS = { { "wield2", "Weapon" }, { "skull2", "Head" }, { "eyes2", "Eyes" }, { "neck2", "Neck" }, { "torso2", "Body" },
        { "arms2", "Arms" }, { "hands2", "Hands" }, { "waist2", "Waist" }, { "legs2", "Legs" }, { "feet2", "Feet" }, { "shield2", "Shield" } };
    static final String PROFILES = "profiles.json";

    static void writeBoard() throws Exception {
        Set<String> hide = new HashSet<String>();
        File h = new File(HIDE);
        if (h.isFile()) for (String l : Files.readAllLines(h.toPath(), StandardCharsets.ISO_8859_1)) if (l.trim().length() > 0) hide.add(l.trim().toLowerCase());
        List<Row> rows = new ArrayList<Row>();
        File[] users = new File("users").listFiles();
        if (users != null) {
            for (File u : users) {
                String name = u.getName();
                if (name.contains(".") || name.equals("default") || hide.contains(name.toLowerCase())) continue;
                Row r = read(u);
                if (r != null && r.privs < GOD_PRIVS && r.exp > 0) rows.add(r);
            }
        }
        Collections.sort(rows, (a, b) -> Long.compare(b.exp, a.exp));
        StringBuilder b = new StringBuilder("{\"updated\":").append(System.currentTimeMillis()).append(",\"players\":[");
        for (int i = 0; i < Math.min(50, rows.size()); i++) {
            Row r = rows.get(i);
            if (i > 0) b.append(',');
            b.append("{\"name\":").append(Who.json(r.name)).append(",\"race\":").append(Who.json(r.race)).append(",\"class\":").append(Who.json(Classes.displayName(r.cls, r.female))).append(",\"title\":").append(Who.json(r.title))
                .append(",\"exp\":").append(r.exp).append(",\"maxhp\":").append(r.maxhp).append(",\"stats\":").append(r.stats)
                .append(",\"quests\":").append(r.quests).append(",\"playtime\":").append(r.playtime).append('}');
        }
        b.append("]}\n");
        put(BOARD, b.toString());
        writeProfiles(rows);
    }

    static void put(String name, String text) throws Exception {
        File tmp = new File(name + ".tmp");
        Files.write(tmp.toPath(), text.getBytes(StandardCharsets.UTF_8));
        if (!tmp.renameTo(new File(name))) {
            Files.write(new File(name).toPath(), text.getBytes(StandardCharsets.UTF_8));
            tmp.delete();
        }
    }

    // Quest titles by "<id>_done" flag, from the quests directory.
    static Map<String, String> questTitles() {
        Map<String, String> out = new HashMap<String, String>();
        File[] qs = new File("quests").listFiles();
        if (qs == null) return out;
        java.util.regex.Pattern t = java.util.regex.Pattern.compile("\"title\":\"((?:[^\"\\\\]|\\\\.)*)\"");
        for (File q : qs) {
            if (!q.getName().endsWith(".json")) continue;
            try {
                java.util.regex.Matcher m = t.matcher(new String(Files.readAllBytes(q.toPath()), StandardCharsets.UTF_8));
                if (m.find()) out.put(q.getName().substring(0, q.getName().length() - 5).toLowerCase() + "_done", m.group(1).replace("\\\"", "\"").replace("\\'", "'"));
            } catch (Exception e) {}
        }
        return out;
    }

    static void writeProfiles(List<Row> rows) throws Exception {
        Map<String, String> titles = questTitles();
        StringBuilder b = new StringBuilder("{\"updated\":").append(System.currentTimeMillis()).append(",\"players\":{");
        String[][] stat = { { "stre", "str" }, { "dext", "dex" }, { "cons", "con" }, { "inte", "int" }, { "wisd", "wis" } };
        boolean first = true;
        for (Row r : rows) {
            if (!first) b.append(',');
            first = false;
            b.append(Who.json(r.name.toLowerCase())).append(":{\"name\":").append(Who.json(r.name)).append(",\"race\":").append(Who.json(r.race)).append(",\"class\":").append(Who.json(Classes.displayName(r.cls, r.female)))
                .append(",\"title\":").append(Who.json(r.title)).append(",\"exp\":").append(r.exp).append(",\"maxhp\":").append(r.maxhp).append(",\"stats\":{");
            for (int i = 0; i < stat.length; i++) b.append(i > 0 ? "," : "").append('"').append(stat[i][1]).append("\":").append(r.each.containsKey(stat[i][0]) ? r.each.get(stat[i][0]) : 0);
            b.append("},\"gear\":[");
            for (int i = 0; i < r.gear.size(); i++) b.append(i > 0 ? "," : "").append("{\"slot\":").append(Who.json(r.gear.get(i)[0])).append(",\"item\":").append(Who.json(r.gear.get(i)[1])).append('}');
            b.append("],\"quests\":[");
            boolean q1 = true;
            for (String f : r.done) {
                String title = titles.get(f.toLowerCase());
                if (title == null) continue; // an old flag, not a quest the wizard knows
                b.append(q1 ? "" : ",").append(Who.json(title));
                q1 = false;
            }
            long[] duels = Achievements.duels(r.name);
            b.append("],\"duels\":{\"wins\":").append(duels[0]).append(",\"losses\":").append(duels[1]).append("}");
            b.append(",\"achievements\":").append(Achievements.json(r.name)).append(",\"playtime\":").append(r.playtime)
                .append(",\"online\":").append(Who.since.containsKey(r.name.toLowerCase())).append('}');
        }
        b.append("}}\n");
        put(PROFILES, b.toString());
        // A copy beside the web pages, which dusk-web serves as it is (so a
        // dusk-web started before serve.py knew profiles.json still has it).
        File web = new File(System.getProperty("user.home"), "dusk-browser-client");
        if (web.isDirectory()) put(new File(web, PROFILES).getPath(), b.toString());
    }

    // A player's saved file: "key\nvalue" pairs, conditions as
    // "condition\n<name>\n<ticks>\n<duration>".
    static Row read(File u) {
        List<String> l;
        try {
            l = Files.readAllLines(u.toPath(), StandardCharsets.ISO_8859_1);
        } catch (Exception e) {
            return null;
        }
        Row r = new Row();
        r.name = u.getName();
        for (int i = 0; i + 1 < l.size(); i++) {
            String k = l.get(i).trim(), v = l.get(i + 1).trim();
            try {
                if (k.equals("exp")) r.exp = Long.parseLong(v);
                else if (k.equals("privs")) r.privs = Integer.parseInt(v);
                else if (k.equals("race")) r.race = v;
                else if (k.equals("title")) r.title = v;
                else if (k.equals("maxhp")) r.maxhp = Integer.parseInt(v);
                else if (k.equals("totalplaytime")) r.playtime = Long.parseLong(v);
                else if (k.equals("stre") || k.equals("dext") || k.equals("cons") || k.equals("inte") || k.equals("wisd")) { r.stats += Integer.parseInt(v); r.each.put(k, Integer.parseInt(v)); }
                else if (k.equals("condition") && v.toLowerCase().endsWith("done")) { r.quests++; r.done.add(v); }
                else if (k.equals("condition") && v.startsWith("class_")) r.cls = v.substring(6);
                else if (k.equals("condition") && v.equals("female")) r.female = true;
                else {
                    String slot = null;
                    for (String[] sl : SLOTS) if (sl[0].equals(k)) slot = sl[1];
                    if (slot == null) continue;
                    if (v.length() > 0 && !v.equals("null")) r.gear.add(new String[] { slot, v });
                }
                i++; // skip the value just read
            } catch (NumberFormatException e) {
                // not a number where one belongs: leave it
            }
        }
        return r;
    }
}
