/*
 * The quest journal, friends lists, and the markers on the world map.
 *
 * Journal: gods write an entry for a flag (the hidden conditions quests
 * set, see Props and the dialogue editor); a player sees the entries for
 * the flags they have.
 *   journal                              your entries: "Journal: <title>|<text>|<done 0/1>"
 *                                        lines, then "Journal: end <n>"
 *   journal all                          (gods) every entry: "JournalDef: <flag>|<title>|<text>|<done>"
 *   journal set <flag>|<title>|<text>|<done 0/1>   (gods)
 *   journal remove <flag>                (gods)
 * Saved in the game's "journal" file, a line per entry in the same form.
 *
 * Friends, kept per character in friends/<name>, one name a line:
 *   friends                "Friends: <name>=<1 online, 0 not>,..."
 *   friend add <name>      (a character that exists)
 *   friend remove <name>
 *
 * Markers: what the world map pins, "Markers: <kind>|<name>|<x>|<y>;...":
 * banks (tellers), shops (merchants) and people with something to say.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Vector;

public class Social {
    static final String JOURNAL = "journal";
    static final String FRIENDS = "friends";
    static final int GOD_PRIVS = 3;
    static final int MAX_FRIENDS = 100;
    // flag (lower case) -> {flag, title, text, done}
    private static final Map<String, String[]> journal = new LinkedHashMap<String, String[]>();

    static synchronized void load() {
        journal.clear();
        File f = new File(JOURNAL);
        if (!f.exists()) return;
        try {
            BufferedReader r = new BufferedReader(new FileReader(f));
            String line;
            while ((line = r.readLine()) != null) {
                String[] p = line.split("\\|", -1);
                if (p.length >= 4 && p[0].matches("[A-Za-z0-9_]{1,40}")) journal.put(p[0].toLowerCase(), new String[] { p[0], p[1], p[2], p[3].equals("1") ? "1" : "0" });
            }
            r.close();
        } catch (Exception e) {
            Log.logError(e, "Error loading " + JOURNAL, false);
        }
    }

    private static synchronized void saveJournal() throws Exception {
        StringBuffer b = new StringBuffer();
        for (String[] e : journal.values()) b.append(e[0]).append('|').append(e[1]).append('|').append(e[2]).append('|').append(e[3]).append('\n');
        Talk.write(new File(JOURNAL), b.toString().getBytes("UTF-8"));
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        String lower = t.toLowerCase();
        try {
            if (lower.equals("journal") || lower.startsWith("journal ")) return journal(who, engine, t.substring(7).trim());
            if (lower.equals("friends")) return friends(who, engine);
            if (lower.startsWith("friend ")) return friend(who, engine, t.substring(7).trim());
            if (lower.equals("markers")) return markers(engine);
        } catch (Exception e) {
            Log.logError(e, "Social \"" + t + "\" by " + who.strName, false);
            return "That didn't work.";
        }
        return null;
    }

    // ---- journal ----

    private static String journal(LivingThing who, DuskEngine engine, String args) throws Exception {
        String lower = args.toLowerCase();
        if (lower.length() == 0) {
            int n = 0;
            List<String[]> mine = new ArrayList<String[]>();
            synchronized (Social.class) {
                for (String[] e : journal.values()) if (who.hasCondition(e[0])) mine.add(e);
            }
            for (String[] e : mine) {
                who.chatMessage("Journal: " + e[1] + "|" + e[2] + "|" + e[3]);
                n++;
            }
            return "Journal: end " + n;
        }
        if (who.privs < GOD_PRIVS) return "Only gods can write the journal.";
        if (lower.equals("all")) {
            List<String[]> all;
            synchronized (Social.class) { all = new ArrayList<String[]>(journal.values()); }
            for (String[] e : all) who.chatMessage("JournalDef: " + e[0] + "|" + e[1] + "|" + e[2] + "|" + e[3]);
            return "JournalDef: end " + all.size();
        }
        if (lower.startsWith("set ")) {
            String[] p = args.substring(4).split("\\|", -1);
            if (p.length < 3) return "Usage: journal set <flag>|<title>|<text>|<done 0/1>";
            String flag = p[0].trim();
            if (!flag.matches("[A-Za-z0-9_]{1,40}")) return "Flags are letters, numbers and _ (up to 40).";
            String title = clean(p[1]), text = clean(p[2]);
            if (title.length() == 0) return "Give the quest a title.";
            String done = p.length >= 4 && p[3].trim().equals("1") ? "1" : "0";
            // The flag needs its hidden condition file, as the editors make.
            File cond = new File("defConditions", flag.toLowerCase());
            if (!cond.exists()) Talk.write(cond, "nodisplay\n.\n".getBytes("UTF-8"));
            synchronized (Social.class) {
                journal.put(flag.toLowerCase(), new String[] { flag, title, text, done });
                saveJournal();
            }
            Log.logEvent(who.strName + " wrote the journal entry for " + flag);
            return "Journal entry saved for " + flag + ".";
        }
        if (lower.startsWith("remove ")) {
            String flag = args.substring(7).trim().toLowerCase();
            synchronized (Social.class) {
                if (journal.remove(flag) == null) return "There's no journal entry for " + flag + ".";
                saveJournal();
            }
            return "Journal entry for " + flag + " removed.";
        }
        return "Journal: journal, journal all, journal set <flag>|<title>|<text>|<done>, journal remove <flag>";
    }

    private static String clean(String s) {
        return s.replace('|', '/').replace('\n', ' ').replace('\r', ' ').trim();
    }

    // ---- friends ----

    private static File friendsFile(LivingThing who) {
        String name = who.strName.toLowerCase();
        return name.matches("[a-z0-9 _-]{1,40}") ? new File(FRIENDS, name) : null;
    }

    private static Vector<String> readFriends(LivingThing who) throws Exception {
        Vector<String> out = new Vector<String>();
        File f = friendsFile(who);
        if (f == null || !f.exists()) return out;
        BufferedReader r = new BufferedReader(new FileReader(f));
        try {
            String line;
            while ((line = r.readLine()) != null) if (line.trim().length() > 0 && !out.contains(line.trim())) out.add(line.trim());
        } finally {
            r.close();
        }
        return out;
    }

    private static void writeFriends(LivingThing who, Vector<String> list) throws Exception {
        File f = friendsFile(who);
        if (f == null) return;
        new File(FRIENDS).mkdirs();
        StringBuffer b = new StringBuffer();
        for (String n : list) b.append(n).append('\n');
        Talk.write(f, b.toString().getBytes("UTF-8"));
    }

    // Online, and not hiding from this player (a god's wizinvis).
    static boolean online(DuskEngine engine, LivingThing who, String name) {
        LivingThing t = engine.getPlayer(name);
        if (!(t instanceof Player)) return false;
        Player p = (Player) t;
        return !(p.wizInvis && p.privs > who.privs);
    }

    private static String friends(LivingThing who, DuskEngine engine) throws Exception {
        StringBuffer b = new StringBuffer("Friends: ");
        Vector<String> list = readFriends(who);
        for (int i = 0; i < list.size(); i++) b.append(i > 0 ? "," : "").append(list.get(i)).append('=').append(online(engine, who, list.get(i)) ? 1 : 0);
        return b.toString();
    }

    private static String friend(LivingThing who, DuskEngine engine, String args) throws Exception {
        String lower = args.toLowerCase();
        Vector<String> list = readFriends(who);
        if (lower.startsWith("add ")) {
            String name = args.substring(4).trim().toLowerCase();
            if (!name.matches("[a-z0-9 _-]{1,40}") || !new File("users", name).isFile()) return "There's no character called " + name + ".";
            if (name.equals(who.strName.toLowerCase())) return "You're already your own friend.";
            if (list.contains(name)) return friends(who, engine);
            if (list.size() >= MAX_FRIENDS) return "Your friends list is full.";
            list.add(name);
            writeFriends(who, list);
            return friends(who, engine);
        }
        if (lower.startsWith("remove ")) {
            list.remove(args.substring(7).trim().toLowerCase());
            writeFriends(who, list);
            return friends(who, engine);
        }
        return "Friends: friends, friend add <name>, friend remove <name>";
    }

    // ---- world map markers ----

    private static String markers(DuskEngine engine) {
        StringBuffer b = new StringBuffer("Markers: ");
        int n = 0;
        Vector<String> talkers = Talk.talkers();
        java.util.HashSet<String> talk = new java.util.HashSet<String>();
        for (String s : talkers) talk.add(s.toLowerCase());
        for (Object o : engine.vctMerchants.toArray()) {
            DuskObject m = (DuskObject) o;
            n = mark(b, n, "shop", m);
        }
        for (Object o : engine.vctProps.toArray()) {
            DuskObject p = (DuskObject) o;
            if (p instanceof Storage) continue;
            if (Props.isTeller(p)) n = mark(b, n, "bank", p);
            else if (p.strName != null && (talk.contains(p.strName.toLowerCase()) || talksAsLook(p, talk))) n = mark(b, n, "quest", p);
        }
        for (Object o : engine.vctMobs.toArray()) {
            DuskObject m = (DuskObject) o;
            if (m.strName != null && talk.contains(m.strName.toLowerCase())) n = mark(b, n, "quest", m);
        }
        return b.toString();
    }

    // A named prop talks like what it looks like.
    private static boolean talksAsLook(DuskObject p, java.util.Set<String> talk) {
        String look = Props.lookOf(new File(Props.DIR, p.strName));
        return look != null && talk.contains(look.toLowerCase());
    }

    private static int mark(StringBuffer b, int n, String kind, DuskObject o) {
        if (o.strName == null) return n;
        b.append(n > 0 ? ";" : "").append(kind).append('|').append(o.strName.replace('|', ' ').replace(';', ' ')).append('|').append(o.intLocX).append('|').append(o.intLocY);
        return n + 1;
    }
}
