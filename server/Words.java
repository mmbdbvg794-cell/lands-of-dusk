/*
 * Slurs kept out of character names and chat, from a word list the owner
 * keeps in conf/badwords (one word per line, # for notes):
 *
 *   word    blocked as a whole word in chat (and its plural), and anywhere
 *           inside a new character's or pet's name
 *   *word   blocked anywhere: inside other words, and with spaces or dots
 *           between its letters
 *
 * The list is read again whenever the file changes (no restart, no
 * reloadprefs). Before matching, text is lowercased, accents dropped, and
 * look-alikes undone (1 i, 3 e, @ a, $ s...); a listed letter matches one
 * or more of it ("niiice"), and single letters split by spaces are joined.
 *
 * Commands.parseCommand hands every line a player types here first (patch.py),
 * before even commands/ scripts: a line with a listed word is never sent,
 * only the sender is told, and it goes in logs/language.log with online gods
 * told too. Three in ten minutes and a player (not a god) is nochanneled for
 * half an hour. A nochanneled player can't say ("'") either: the engine let
 * them. LivingThing.isValidName (LivingThingPatch) asks validName, so new
 * names with a listed word get the usual "Not a valid name"; characters that
 * already exist still log in.
 *
 * forum.py reads the same file and matches the same way (keep them alike).
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Date;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

public class Words {
    static final String FILE = "conf/badwords", LOG = "logs/language.log";
    static final int STRIKES = 3, GOD_PRIVS = 2;
    static final long WINDOW = 10 * 60 * 1000L;
    static final int SILENCE = 30 * 60; // engine nochannel counts seconds
    static final String BLOCKED = "That language isn't allowed here.";

    private static long loadedAt = -1;
    private static List<Pattern> whole = new ArrayList<Pattern>(), anywhere = new ArrayList<Pattern>(), inNames = new ArrayList<Pattern>();
    private static final Map<String, Deque<Long>> strikes = new HashMap<String, Deque<Long>>();

    /** Called first for every command; a reply stops the line, null lets it through. */
    static String check(LivingThing who, DuskEngine engine, String line) {
        try {
            Player speaker = who instanceof Player ? (Player) who
                    : who != null && who.isPet() && who.thnMaster instanceof Player ? (Player) who.thnMaster : null;
            if (speaker == null || line == null) return null;
            if (who.noChannel != 0 && (line.startsWith("'") || line.toLowerCase().startsWith("say "))) return "You can't do that when nochanneled.";
            if (!blocked(line)) return null;
            strike(speaker, engine, line);
            return BLOCKED;
        } catch (Exception e) {
            Log.logError(e, "Words.check", false);
            return null;
        }
    }

    /** The engine's own rule (letters only, not "default"), and no listed word in a new name. */
    static boolean validName(String name) {
        char[] letters = name.toCharArray();
        for (char c : letters) if (!Character.isLetter(c)) return false;
        if (name.toLowerCase().equals("default")) return false;
        if (name.length() > 0 && new File("users/" + name.toLowerCase()).exists()) return true;
        return nameOk(name);
    }

    static boolean nameOk(String name) {
        load();
        for (String form : forms(name)) {
            String squashed = form.replace(" ", "");
            for (Pattern p : inNames) if (p.matcher(squashed).find()) return false;
        }
        return true;
    }

    static boolean blocked(String line) {
        load();
        for (String form : forms(line)) {
            for (String token : tokens(form))
                for (Pattern p : whole) if (p.matcher(token).matches()) return true;
            String squashed = form.replace(" ", "");
            for (Pattern p : anywhere) if (p.matcher(squashed).find()) return true;
        }
        return false;
    }

    private static void strike(Player p, DuskEngine engine, String line) {
        long now = System.currentTimeMillis();
        int count;
        synchronized (strikes) {
            Deque<Long> times = strikes.get(p.strName.toLowerCase());
            if (times == null) strikes.put(p.strName.toLowerCase(), times = new ArrayDeque<Long>());
            while (!times.isEmpty() && now - times.peekFirst() > WINDOW) times.pollFirst();
            times.addLast(now);
            count = times.size();
            if (count >= STRIKES) times.clear();
        }
        boolean silence = count >= STRIKES && p.privs < GOD_PRIVS;
        if (silence) {
            p.noChannel = SILENCE;
            p.chatMessage("You have been nochanneled for " + (SILENCE / 60) + " minutes.\n");
        }
        log(p.strName + (silence ? " (nochanneled)" : " (" + count + " of " + STRIKES + ")") + ": " + line);
        tellGods(engine, p, "Language filter: " + p.strName + " was blocked" + (silence ? " and nochanneled for " + (SILENCE / 60) + " minutes" : " (" + count + " of " + STRIKES + ")") + ". See " + LOG + ".");
    }

    private static void tellGods(DuskEngine engine, Player offender, String message) {
        List<Object> players;
        synchronized (engine.vctSockets) {
            players = new ArrayList<Object>(engine.vctSockets);
        }
        for (Object o : players)
            if (o instanceof Player && o != offender && ((Player) o).privs >= GOD_PRIVS) ((Player) o).chatMessage(message + "\n");
    }

    private static synchronized void log(String text) {
        try {
            new File(LOG).getParentFile().mkdirs();
            FileWriter w = new FileWriter(LOG, true);
            w.write(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()) + " " + text + "\n");
            w.close();
        } catch (Exception e) {
            Log.logError(e, "Error writing " + LOG, false);
        }
    }

    /** The list again if the file changed since it was read. */
    private static synchronized void load() {
        File f = new File(FILE);
        long at = f.exists() ? f.lastModified() : 0;
        if (at == loadedAt) return;
        List<Pattern> w = new ArrayList<Pattern>(), a = new ArrayList<Pattern>(), n = new ArrayList<Pattern>();
        if (at != 0) {
            try {
                BufferedReader r = new BufferedReader(new FileReader(f));
                String line;
                while ((line = r.readLine()) != null) {
                    line = line.trim().toLowerCase();
                    if (line.isEmpty() || line.startsWith("#")) continue;
                    boolean star = line.startsWith("*");
                    String word = letters(line);
                    if (word.isEmpty()) continue;
                    String body = pattern(word);
                    if (star) a.add(Pattern.compile(body));
                    else w.add(Pattern.compile(body + "(s|es|z)?"));
                    n.add(Pattern.compile(body));
                }
                r.close();
            } catch (Exception e) {
                Log.logError(e, "Error loading " + FILE, false);
                return;
            }
        }
        whole = w;
        anywhere = a;
        inNames = n;
        loadedAt = at;
    }

    /** "abc" becomes a+b+c+: each letter once or more. */
    static String pattern(String word) {
        StringBuilder out = new StringBuilder();
        for (char c : word.toCharArray()) out.append(c).append('+');
        return out.toString();
    }

    private static String letters(String s) {
        StringBuilder out = new StringBuilder();
        for (char c : s.toCharArray()) if (c >= 'a' && c <= 'z') out.append(c);
        return out.toString();
    }

    private static final String LEET_FROM = "01!|34@5$7+89", LEET_TO = "oiiieaassttbg";

    /**
     * The text two ways, lowercase a-z and single spaces: look-alikes as the
     * letters they stand for ("n1g"), and as spaces ("word!" stays "word").
     */
    static String[] forms(String text) {
        String plain = Normalizer.normalize(text.toLowerCase(), Normalizer.Form.NFD);
        StringBuilder leet = new StringBuilder(), spaced = new StringBuilder();
        for (char c : plain.toCharArray()) {
            if (Character.getType(c) == Character.NON_SPACING_MARK) continue;
            int i = LEET_FROM.indexOf(c);
            if (c >= 'a' && c <= 'z') {
                leet.append(c);
                spaced.append(c);
            } else {
                leet.append(i >= 0 ? LEET_TO.charAt(i) : ' ');
                spaced.append(' ');
            }
        }
        return new String[] { leet.toString(), spaced.toString() };
    }

    /** Words, with runs of single letters joined ("n i g" is one word). */
    static List<String> tokens(String form) {
        List<String> out = new ArrayList<String>();
        StringBuilder run = new StringBuilder();
        for (String t : form.trim().split(" +")) {
            if (t.isEmpty()) continue;
            if (t.length() == 1) {
                run.append(t);
                continue;
            }
            if (run.length() > 0) {
                out.add(run.toString());
                run.setLength(0);
            }
            out.add(t);
        }
        if (run.length() > 0) out.add(run.toString());
        return out;
    }
}
