/*
 * Bug reports to the gods, as private messages. The client's "Report a
 * bug" (Settings) sends one; every god (privs above 1, the gods on the
 * who's-online page) gets it at once if they're in the game, or finds it
 * waiting when they next log in. Every report is also kept in the
 * "bugreports" file.
 *
 *   bugreport <subject> <body>   both URL-encoded (the body has line
 *                                breaks); the sender is told who got it
 *
 * Player mail (js/mail.js, the Mail tab): letters between players, kept
 * in mailbox/<name> (lower case), one a line: id|from|when (ms)|read
 * (1/0)|URL-encoded text, at most MAX_BOX letters (the oldest read ones go
 * first).
 *   mail send <name> <text, URL-encoded>   to anyone with a character;
 *                                          one letter every SEND_GAP_MS
 *   mail list                 "MailItem: id|from|when|read|URL-encoded
 *                             text", newest first, then "MailList: done|unread"
 *   mail read <id>            "MailBody: id|from|when|URL-encoded text",
 *                             and it's marked read
 *   mail delete <id>          "MailDeleted: <id>"
 * A letter to someone in the game tells them at once ("MailNew: <from>|
 * <unread>"); otherwise they're told when they next come in ("MailNew:
 * |<unread>"), as long as something is unread.
 *
 * Waiting messages are in mail/<god>, one URL-encoded message a line, at
 * most MAX_WAITING each (the oldest go). A god is "in" once the server has
 * finished loading them (blnWorking) and they've been seen on two checks
 * in a row, so the presence question at login comes first.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;

public class Mail {
    static final String DIR = "mail";
    static final String LOG = "bugreports";
    static final int GOD = 2; // privs at least this
    static final long STEP_MS = 3000;
    static final long GAP_MS = 60000; // one report a minute from each player
    static final int MAX_WAITING = 30;
    static final int MAX_LINES = 40; // of a report, as delivered
    static final int MAX_LENGTH = 6000;
    static final String BOX = "mailbox";
    static final int MAX_BOX = 100, MAX_LETTER = 2000;
    static final long SEND_GAP_MS = 5000;
    private static final Map<String, Long> lastLetter = new HashMap<String, Long>();
    private static Set<String> told = new HashSet<String>(); // told about their mail since coming in
    private static final Map<String, Long> lastReport = new HashMap<String, Long>();
    private static Set<String> seenBefore = new HashSet<String>();

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String lower = line.toLowerCase();
        if (lower.equals("mail") || lower.startsWith("mail ")) return letters(who, engine, line.trim());
        if (!(lower.equals("bugreport") || lower.startsWith("bugreport "))) return null;
        String[] p = line.substring(9).trim().split(" ", 2);
        try {
            String subject = URLDecoder.decode(p[0], "UTF-8").trim();
            String body = p.length > 1 ? URLDecoder.decode(p[1], "UTF-8").trim() : "";
            if (subject.length() == 0 && body.length() == 0) return "Bug report: nothing to send.";
            String key = who.strName.toLowerCase();
            long now = System.currentTimeMillis();
            synchronized (lastReport) {
                Long last = lastReport.get(key);
                if (last != null && now - last < GAP_MS && who.privs < GOD) return "Bug report: you've just sent one; wait a minute before the next.";
                lastReport.put(key, now);
            }
            String text = "Bug report from " + who.strName + " (" + stamp(now) + "): " + subject + (body.length() > 0 ? "\n" + body : "");
            if (text.length() > MAX_LENGTH) text = text.substring(0, MAX_LENGTH) + "\n(cut short)";
            append(new File(LOG), "==== " + text + "\n\n");
            int inGame = 0, later = 0;
            Map<String, Player> online = online(engine);
            for (String god : gods()) {
                Player p2 = online.get(god);
                if (p2 != null) { deliver(p2, text); inGame++; }
                else { store(god, text); later++; }
            }
            Log.logEvent(who.strName + " sent a bug report: " + subject);
            if (inGame + later == 0) return "Bug report: saved (there are no gods to send it to).";
            return "Bug report sent to the gods" + (inGame > 0 ? " (" + inGame + " in the game now" + (later > 0 ? ", " + later + " when they log in)" : ")") : " (they'll see it when they log in)") + ". Thank you!";
        } catch (Exception e) {
            Log.logError(e, "Mail: bug report from " + who.strName, false);
            return "Bug report: that didn't work.";
        }
    }

    public static void start(final DuskEngine engine) {
        new File(DIR).mkdirs();
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        Thread.sleep(STEP_MS);
                        check(engine);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Mail", false);
                    }
                }
            }
        }, "Mail");
        t.setDaemon(true);
        t.start();
    }

    // ---- player mail ----

    static class Letter {
        long id, when;
        String from, text; // text URL-encoded
        boolean read;
    }

    static File box(String name) {
        return new File(BOX, name.toLowerCase().replaceAll("[^a-z0-9_ -]", "_"));
    }

    static synchronized List<Letter> readBox(String name) throws Exception {
        List<Letter> out = new ArrayList<Letter>();
        File f = box(name);
        if (!f.isFile()) return out;
        for (String l : Files.readAllLines(f.toPath(), java.nio.charset.StandardCharsets.UTF_8)) {
            String[] p = l.split("\\|", 5);
            if (p.length < 5) continue;
            Letter m = new Letter();
            try {
                m.id = Long.parseLong(p[0]);
                m.from = p[1];
                m.when = Long.parseLong(p[2]);
                m.read = p[3].equals("1");
                m.text = p[4];
                out.add(m);
            } catch (NumberFormatException e) {}
        }
        return out;
    }

    static synchronized void writeBox(String name, List<Letter> box) throws Exception {
        new File(BOX).mkdirs();
        StringBuilder b = new StringBuilder();
        for (Letter m : box) b.append(m.id).append('|').append(m.from).append('|').append(m.when).append('|').append(m.read ? 1 : 0).append('|').append(m.text).append('\n');
        Talk.write(box(name), b.toString().getBytes("UTF-8"));
    }

    static int unread(List<Letter> box) {
        int n = 0;
        for (Letter m : box) if (!m.read) n++;
        return n;
    }

    // Someone with a character called that (any case): their name as saved.
    static String player(String name) {
        if (!name.matches("[A-Za-z0-9_ -]{1,30}")) return null;
        File[] users = new File("users").listFiles();
        if (users == null) return null;
        for (File u : users) if (u.isFile() && u.getName().equalsIgnoreCase(name) && !u.getName().contains(".")) return u.getName();
        return null;
    }

    static String letters(LivingThing who, DuskEngine engine, String line) {
        String[] a = line.split(" ", 3);
        String verb = a.length > 1 ? a[1].toLowerCase() : "list";
        try {
            if (verb.equals("send")) {
                if (a.length < 3) return "Usage: mail send <name> <text>";
                String[] p = a[2].split(" ", 2);
                String to = player(p[0].trim());
                if (to == null) return "Mail: there's nobody called " + p[0].trim() + ".";
                String text = p.length > 1 ? URLDecoder.decode(p[1], "UTF-8").trim() : "";
                if (text.length() == 0) return "Mail: the letter is empty.";
                if (text.length() > MAX_LETTER) return "Mail: that's too long (" + MAX_LETTER + " letters at most).";
                long now = System.currentTimeMillis();
                synchronized (lastLetter) {
                    Long last = lastLetter.get(who.strName.toLowerCase());
                    if (last != null && now - last < SEND_GAP_MS && who.privs < GOD) return "Mail: wait a moment before the next letter.";
                    lastLetter.put(who.strName.toLowerCase(), now);
                }
                int unread;
                synchronized (Mail.class) {
                    List<Letter> box = readBox(to);
                    Letter m = new Letter();
                    m.id = now;
                    for (Letter o : box) if (o.id >= m.id) m.id = o.id + 1;
                    m.from = who.strName;
                    m.when = now;
                    m.text = URLEncoder.encode(text, "UTF-8");
                    box.add(m);
                    while (box.size() > MAX_BOX) {
                        int drop = 0;
                        for (int i = 0; i < box.size(); i++) if (box.get(i).read) { drop = i; break; }
                        box.remove(drop);
                    }
                    writeBox(to, box);
                    unread = unread(box);
                }
                Player there = online(engine).get(to.toLowerCase());
                if (there != null) there.chatMessage("MailNew: " + who.strName + "|" + unread + "\n");
                Log.logEvent("Mail: " + who.strName + " wrote to " + to);
                return "Mail: sent to " + to + ".";
            }
            if (verb.equals("list")) {
                List<Letter> box = readBox(who.strName);
                for (int i = box.size() - 1; i >= 0; i--) {
                    Letter m = box.get(i);
                    who.chatMessage("MailItem: " + m.id + "|" + m.from + "|" + m.when + "|" + (m.read ? 1 : 0) + "|" + m.text + "\n");
                }
                return "MailList: done|" + unread(box);
            }
            if (verb.equals("read") || verb.equals("delete")) {
                if (a.length < 3 || !a[2].trim().matches("\\d{1,19}")) return "Usage: mail " + verb + " <id>";
                long id = Long.parseLong(a[2].trim());
                synchronized (Mail.class) {
                    List<Letter> box = readBox(who.strName);
                    for (int i = 0; i < box.size(); i++) {
                        Letter m = box.get(i);
                        if (m.id != id) continue;
                        if (verb.equals("delete")) { box.remove(i); writeBox(who.strName, box); return "MailDeleted: " + id; }
                        if (!m.read) { m.read = true; writeBox(who.strName, box); }
                        return "MailBody: " + m.id + "|" + m.from + "|" + m.when + "|" + m.text;
                    }
                }
                return "Mail: that letter isn't there any more.";
            }
        } catch (Exception e) {
            Log.logError(e, "Mail: " + line, false);
            return "Mail: that didn't work.";
        }
        return "Usage: mail list | read <id> | delete <id> | send <name> <text>";
    }

    // Hands out waiting mail to whoever is in now and was a check ago.
    static void check(DuskEngine engine) throws Exception {
        Map<String, Player> online = online(engine);
        // Letters that came while they were away: told once, on coming in.
        Set<String> stillTold = new HashSet<String>();
        for (Map.Entry<String, Player> e : online.entrySet()) {
            if (told.contains(e.getKey())) { stillTold.add(e.getKey()); continue; }
            if (!seenBefore.contains(e.getKey())) continue;
            stillTold.add(e.getKey());
            int n = unread(readBox(e.getKey()));
            if (n > 0) e.getValue().chatMessage("MailNew: |" + n + "\n");
        }
        told = stillTold;
        for (Map.Entry<String, Player> e : online.entrySet()) {
            if (!seenBefore.contains(e.getKey())) continue;
            File f = new File(DIR, e.getKey());
            if (!f.isFile()) continue;
            List<String> waiting;
            synchronized (Mail.class) {
                waiting = Files.readAllLines(f.toPath());
                f.delete();
            }
            int n = 0;
            for (String m : waiting) if (m.trim().length() > 0) n++;
            if (n == 0) continue;
            e.getValue().chatMessage(n == 1 ? "** A message waited for you:" : "** " + n + " messages waited for you:");
            for (String m : waiting) if (m.trim().length() > 0) deliver(e.getValue(), URLDecoder.decode(m.trim(), "UTF-8"));
        }
        seenBefore = new HashSet<String>(online.keySet());
    }

    // The report as chat lines: what the player wrote, and of the technical
    // details (the client's "--- details ---" part) only where they were;
    // the rest is in the bugreports file.
    static void deliver(Player p, String text) {
        List<String> out = new ArrayList<String>();
        boolean details = false, more = false;
        for (String l : text.split("\n")) {
            if (l.trim().equals("--- details ---")) { details = true; continue; }
            if (!details) out.add(l);
            else if (l.startsWith("Character: ")) out.add(l);
            else more = true;
        }
        while (out.size() > 1 && out.get(out.size() - 1).trim().length() == 0) out.remove(out.size() - 1);
        int n = Math.min(out.size(), MAX_LINES);
        for (int i = 0; i < n; i++) p.chatMessage((i == 0 ? "** " : "   ") + out.get(i));
        if (out.size() > n || more) p.chatMessage("   (more in the bugreports file)");
    }

    static synchronized void store(String god, String text) throws Exception {
        File f = new File(DIR, god);
        List<String> waiting = f.isFile() ? new ArrayList<String>(Files.readAllLines(f.toPath())) : new ArrayList<String>();
        waiting.add(URLEncoder.encode(text, "UTF-8"));
        while (waiting.size() > MAX_WAITING) waiting.remove(0);
        StringBuilder b = new StringBuilder();
        for (String w : waiting) if (w.trim().length() > 0) b.append(w.trim()).append('\n');
        Talk.write(f, b.toString().getBytes("UTF-8"));
    }

    static synchronized void append(File f, String text) throws Exception {
        byte[] old = f.isFile() ? Files.readAllBytes(f.toPath()) : new byte[0];
        byte[] add = text.getBytes("UTF-8");
        byte[] all = new byte[old.length + add.length];
        System.arraycopy(old, 0, all, 0, old.length);
        System.arraycopy(add, 0, all, old.length, add.length);
        Talk.write(f, all);
    }

    // Players fully in the game, by lower-case name.
    static Map<String, Player> online(DuskEngine engine) {
        List<Object> all;
        synchronized (engine.vctSockets) {
            all = new ArrayList<Object>(engine.vctSockets);
        }
        Map<String, Player> out = new HashMap<String, Player>();
        for (Object o : all) {
            if (!(o instanceof Player)) continue;
            Player p = (Player) o;
            if (p.strName != null && p.blnWorking) out.put(p.strName.toLowerCase(), p);
        }
        return out;
    }

    // Every god's name (lower case), from the users files.
    static List<String> gods() throws Exception {
        List<String> out = new ArrayList<String>();
        File[] users = new File("users").listFiles();
        if (users == null) return out;
        for (File u : users) {
            String n = u.getName();
            if (n.contains(".") || !u.isFile()) continue;
            List<String> lines = Files.readAllLines(u.toPath(), java.nio.charset.StandardCharsets.ISO_8859_1);
            for (int i = 0; i + 1 < lines.size(); i++) {
                if (!lines.get(i).trim().equals("privs")) continue;
                try {
                    if (Integer.parseInt(lines.get(i + 1).trim()) >= GOD) out.add(n.toLowerCase());
                } catch (NumberFormatException e) {}
                break;
            }
        }
        return out;
    }

    static String stamp(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd HH:mm 'UTC'");
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date(ms));
    }
}
