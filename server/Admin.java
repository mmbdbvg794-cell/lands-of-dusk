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
 * Leaderboard: every 5 minutes, leaderboard.json in the game directory
 * (serve.py hands it out beside leaderboard.html): the top 50 players by
 * experience, from their saved files, gods and anyone named in the
 * "leaderboard.hide" file (a name a line) left out.
 *
 *   { "updated": <ms>, "players": [ { "name", "race", "title", "exp",
 *     "maxhp", "stats" (str+dex+con+int+wis), "quests" (finished: flags
 *     ending in "done"), "playtime" (ms) } ] }
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
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

    // ---- the leaderboard ----

    static class Row {
        String name, race = "", title = "";
        long exp, playtime;
        int maxhp, stats, quests, privs;
    }

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
                if (r != null && r.privs < GOD_PRIVS) rows.add(r);
            }
        }
        Collections.sort(rows, (a, b) -> Long.compare(b.exp, a.exp));
        StringBuilder b = new StringBuilder("{\"updated\":").append(System.currentTimeMillis()).append(",\"players\":[");
        for (int i = 0; i < Math.min(50, rows.size()); i++) {
            Row r = rows.get(i);
            if (i > 0) b.append(',');
            b.append("{\"name\":").append(Who.json(r.name)).append(",\"race\":").append(Who.json(r.race)).append(",\"title\":").append(Who.json(r.title))
                .append(",\"exp\":").append(r.exp).append(",\"maxhp\":").append(r.maxhp).append(",\"stats\":").append(r.stats)
                .append(",\"quests\":").append(r.quests).append(",\"playtime\":").append(r.playtime).append('}');
        }
        b.append("]}\n");
        File tmp = new File(BOARD + ".tmp");
        Files.write(tmp.toPath(), b.toString().getBytes(StandardCharsets.UTF_8));
        if (!tmp.renameTo(new File(BOARD))) {
            Files.write(new File(BOARD).toPath(), b.toString().getBytes(StandardCharsets.UTF_8));
            tmp.delete();
        }
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
                else if (k.equals("stre") || k.equals("dext") || k.equals("cons") || k.equals("inte") || k.equals("wisd")) r.stats += Integer.parseInt(v);
                else if (k.equals("condition") && v.toLowerCase().endsWith("done")) r.quests++;
                else continue;
                i++; // skip the value just read
            } catch (NumberFormatException e) {
                // not a number where one belongs: leave it
            }
        }
        return r;
    }
}
