/*
 * Achievements: milestones players earn (Dragonslayer, Bounty Hunter...),
 * kept in achieved/<name> and shown in the game (js/achievements.js) and on
 * the player's profile page (profile.html, from profiles.json written by
 * server/Admin.java).
 *
 * The "achievements" file (tools/world/cities/achievements.mjs writes it;
 * "achievements reload" reads it again), a line each:
 *   <id>|<title>|<what to do>|<kind>|<what>|<how many>
 * kinds:
 *   kills      defeat <how many> creatures (any)
 *   kill       defeat <how many> of the creatures named in <what> (comma-
 *              separated, any of them)
 *   killset    defeat each creature named in <what> at least once
 *   boss       help bring down <how many> world bosses
 *   bossset    help bring down each world boss named in <what>
 *   bounty     finish <how many> bounty jobs (a bounty's kill goal done)
 *   duelwins   win <how many> duels (server/Duel.java)
 *   flags      hold every flag in <what> (quests' "_done" flags)
 *   exp        have <how many> experience
 * Kills count for whoever Quests.killed credits (the winners and their
 * party nearby).
 *
 * achieved/<name>, a line each: "earned|<id>|<ms>" or "count|<key>|<n>"
 * (keys: kills, kill:<creature>, boss, boss:<name>, bounty, duelwin, duelloss).
 *
 *   achievements [name]  "Achv: id|title|what|earned ms (0: not yet)|
 *                        progress|goal" for each, then "Achv: done|<name>"
 *   achievements reload  (gods)
 * Earning one: "Achievement: <title>|<what>" to the player (a banner) and
 * "<name> has earned <title>!" to everyone.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Achievements {
    static final String FILE = "achievements", DIR = "achieved";
    static final long STEP_MS = 30000;

    static class Def {
        String id, title, what, kind;
        String[] names = new String[0];
        long goal;
    }

    static class Progress {
        final Map<String, Long> earned = new LinkedHashMap<String, Long>();
        final Map<String, Long> counts = new HashMap<String, Long>();
    }

    static List<Def> defs = new ArrayList<Def>();
    static final Map<String, Progress> cache = new HashMap<String, Progress>();
    static DuskEngine engine;
    // Players checked since the server started: the first check catches up
    // on what they'd already done (quests, experience) quietly.
    static final java.util.Set<String> caughtUp = new java.util.HashSet<String>();

    public static void start(final DuskEngine e) {
        engine = e;
        new File(DIR).mkdirs();
        load();
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        Thread.sleep(STEP_MS);
                        for (Player p : Mail.online(engine).values()) check(p, !caughtUp.contains(p.strName.toLowerCase()));
                    } catch (InterruptedException ie) {
                        return;
                    } catch (Exception ex) {
                        Log.logError(ex, "Achievements", false);
                    }
                }
            }
        }, "Achievements");
        t.setDaemon(true);
        t.start();
    }

    static synchronized void load() {
        List<Def> out = new ArrayList<Def>();
        try {
            File f = new File(FILE);
            if (f.isFile()) for (String raw : Files.readAllLines(f.toPath(), StandardCharsets.UTF_8)) {
                String l = raw.trim();
                if (l.length() == 0 || l.startsWith("#")) continue;
                String[] p = l.split("\\|", -1);
                if (p.length < 6) continue;
                Def d = new Def();
                d.id = p[0].trim().toLowerCase();
                d.title = p[1].trim();
                d.what = p[2].trim();
                d.kind = p[3].trim().toLowerCase();
                if (p[4].trim().length() > 0) d.names = p[4].trim().split("\\s*,\\s*");
                try { d.goal = Math.max(1, Long.parseLong(p[5].trim())); } catch (NumberFormatException e) { d.goal = 1; }
                if (d.kind.endsWith("set") || d.kind.equals("flags")) d.goal = d.names.length;
                out.add(d);
            }
        } catch (Exception e) {
            Log.logError(e, "Achievements: reading " + FILE, false);
        }
        defs = out;
    }

    static File file(String name) {
        return new File(DIR, name.toLowerCase().replaceAll("[^a-z0-9_ -]", "_"));
    }

    static synchronized Progress progress(String name) {
        String key = name.toLowerCase();
        Progress pr = cache.get(key);
        if (pr != null) return pr;
        pr = new Progress();
        try {
            File f = file(name);
            if (f.isFile()) for (String l : Files.readAllLines(f.toPath(), StandardCharsets.UTF_8)) {
                String[] p = l.split("\\|", 3);
                if (p.length < 3) continue;
                try {
                    if (p[0].equals("earned")) pr.earned.put(p[1], Long.parseLong(p[2]));
                    else if (p[0].equals("count")) pr.counts.put(p[1], Long.parseLong(p[2]));
                } catch (NumberFormatException e) {}
            }
        } catch (Exception e) {
            Log.logError(e, "Achievements: reading " + name, false);
        }
        cache.put(key, pr);
        return pr;
    }

    static synchronized void save(String name, Progress pr) {
        StringBuilder b = new StringBuilder();
        for (Map.Entry<String, Long> e : pr.earned.entrySet()) b.append("earned|").append(e.getKey()).append('|').append(e.getValue()).append('\n');
        for (Map.Entry<String, Long> e : pr.counts.entrySet()) b.append("count|").append(e.getKey()).append('|').append(e.getValue()).append('\n');
        try {
            Talk.write(file(name), b.toString().getBytes("UTF-8"));
        } catch (Exception e) {
            Log.logError(e, "Achievements: saving " + name, false);
        }
    }

    static long count(Progress pr, String key) {
        Long n = pr.counts.get(key);
        return n == null ? 0 : n;
    }

    static void add(Progress pr, String key) {
        pr.counts.put(key, count(pr, key) + 1);
    }

    // ---- what happened ----

    // A creature defeated (called from Quests.killed for each one credited).
    static void killed(Player p, String creature) {
        try {
            Progress pr = progress(p.strName);
            synchronized (Achievements.class) {
                add(pr, "kills");
                add(pr, "kill:" + creature.toLowerCase());
            }
            check(p);
        } catch (Exception e) {
            Log.logError(e, "Achievements: kill", false);
        }
    }

    // A world boss brought down (server/WorldBoss.java's reward).
    static void boss(Player p, String bossName) {
        try {
            Progress pr = progress(p.strName);
            synchronized (Achievements.class) {
                add(pr, "boss");
                add(pr, "boss:" + bossName.toLowerCase());
            }
            check(p);
        } catch (Exception e) {
            Log.logError(e, "Achievements: boss", false);
        }
    }

    // A duel decided (server/Duel.java): a win for one, a loss for the other.
    static void duel(Player winner, Player loser) {
        try {
            synchronized (Achievements.class) {
                add(progress(winner.strName), "duelwin");
                save(winner.strName, progress(winner.strName));
                add(progress(loser.strName), "duelloss");
                save(loser.strName, progress(loser.strName));
            }
            check(winner);
        } catch (Exception e) {
            Log.logError(e, "Achievements: duel", false);
        }
    }

    // A player's duel record: { wins, losses }.
    static long[] duels(String name) {
        Progress pr = progress(name);
        synchronized (Achievements.class) {
            return new long[] { count(pr, "duelwin"), count(pr, "duelloss") };
        }
    }

    // A bounty job's kill goal done (server/Quests.java).
    static void bounty(Player p) {
        try {
            Progress pr = progress(p.strName);
            synchronized (Achievements.class) {
                add(pr, "bounty");
            }
            check(p);
        } catch (Exception e) {
            Log.logError(e, "Achievements: bounty", false);
        }
    }

    // How far along a player is: { progress, goal }.
    static long[] where(Def d, Progress pr, LivingThing p) {
        long n = 0;
        if (d.kind.equals("kills")) n = count(pr, "kills");
        else if (d.kind.equals("kill")) { for (String c : d.names) n += count(pr, "kill:" + c.toLowerCase()); }
        else if (d.kind.equals("killset")) { for (String c : d.names) if (count(pr, "kill:" + c.toLowerCase()) > 0) n++; }
        else if (d.kind.equals("boss")) n = count(pr, "boss");
        else if (d.kind.equals("bossset")) { for (String c : d.names) if (count(pr, "boss:" + c.toLowerCase()) > 0) n++; }
        else if (d.kind.equals("bounty")) n = count(pr, "bounty");
        else if (d.kind.equals("duelwins")) n = count(pr, "duelwin");
        else if (d.kind.equals("flags")) { if (p != null) for (String f : d.names) if (p.hasCondition(f)) n++; }
        else if (d.kind.equals("exp")) n = p != null ? Math.min(d.goal, ((Player) p).exp) : 0;
        return new long[] { Math.min(n, d.goal), d.goal };
    }

    static void check(Player p) {
        if (p == null || p.strName == null) return;
        boolean first;
        synchronized (Achievements.class) { first = !caughtUp.contains(p.strName.toLowerCase()); }
        check(p, first);
    }

    // Anything newly earned is told and saved; `quiet`: catching up on
    // what was done before achievements existed, told in one line.
    static void check(Player p, boolean quiet) {
        if (p == null || p.strName == null) return;
        if (quiet) synchronized (Achievements.class) { caughtUp.add(p.strName.toLowerCase()); }
        List<Def> got = new ArrayList<Def>();
        Progress pr = progress(p.strName);
        synchronized (Achievements.class) {
            for (Def d : defs) {
                if (pr.earned.containsKey(d.id)) continue;
                long[] w = where(d, pr, p);
                if (w[0] >= w[1]) { pr.earned.put(d.id, System.currentTimeMillis()); got.add(d); }
            }
            save(p.strName, pr);
        }
        if (quiet) {
            if (!got.isEmpty()) {
                List<String> t = new ArrayList<String>();
                for (Def d : got) t.add(d.title);
                p.chatMessage("For what you've already done, you have achievements: " + String.join(", ", t) + ". See them in the Journal tab.\n");
            }
            return;
        }
        for (Def d : got) {
            p.chatMessage("Achievement: " + d.title + "|" + d.what + "\n");
            engine.chatMessage(p.strName + " has earned " + d.title + "!");
            Log.logEvent(p.strName + " earned the achievement " + d.title);
        }
    }

    // Earned achievements as JSON, for the profile page (Admin.writeBoard).
    static String json(String name) {
        Progress pr = progress(name);
        StringBuilder b = new StringBuilder("[");
        boolean first = true;
        synchronized (Achievements.class) {
            for (Def d : defs) {
                Long when = pr.earned.get(d.id);
                if (when == null) continue;
                if (!first) b.append(',');
                first = false;
                b.append("{\"id\":").append(Who.json(d.id)).append(",\"title\":").append(Who.json(d.title)).append(",\"what\":").append(Who.json(d.what)).append(",\"when\":").append(when).append('}');
            }
        }
        return b.append(']').toString();
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String lower = line.trim().toLowerCase();
        if (!(lower.equals("achievements") || lower.startsWith("achievements "))) return null;
        String arg = lower.length() > 12 ? line.trim().substring(13).trim() : "";
        if (arg.equalsIgnoreCase("reload")) {
            if (who.privs < 3) return "Only gods can do that.";
            load();
            return "Achievements: " + defs.size() + " read from " + FILE + ".";
        }
        String name = arg.length() > 0 ? arg : who.strName;
        LivingThing p = arg.length() > 0 ? Mail.online(engine).get(arg.toLowerCase()) : who;
        if (arg.length() > 0 && Mail.player(arg) == null) return "There's nobody called " + arg + ".";
        if (arg.length() > 0 && Mail.player(arg) != null) name = Mail.player(arg);
        Progress pr = progress(name);
        synchronized (Achievements.class) {
            for (Def d : defs) {
                long[] w = where(d, pr, p);
                Long when = pr.earned.get(d.id);
                who.chatMessage("Achv: " + d.id + "|" + d.title.replace('|', '/') + "|" + d.what.replace('|', '/') + "|" + (when == null ? 0 : when) + "|" + w[0] + "|" + w[1] + "\n");
            }
        }
        return "Achv: done|" + name;
    }
}
