/*
 * Props with names of their own: a villager called George, a guard called
 * Military Captain. Each is its own prop file, a copy of the prop it looks
 * like with "look <that prop>" added, so it's saved and reloaded like any
 * prop, can have its own conversation (talk/<name>), and the client knows
 * how to draw it.
 *
 *   nameprop <prop>|<name>   (gods) place a prop that looks like <prop>,
 *                            called <name>, on your square
 *   prop looks               "Looks: <name>=<prop>; ..." for the client
 *
 * Commands.parseCommand hands commands here after Storage and Talk.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;

public class Props {
    static final String DIR = "defProps";
    static final int GOD_PRIVS = 3; // the same as placing things with "<"

    public static String command(LivingThing who, DuskEngine engine, String line) {
        if (line == null) return null;
        String trimmed = line.trim();
        String lower = trimmed.toLowerCase();
        try {
            if (lower.equals("prop looks")) return "Looks: " + looks();
            if (lower.startsWith("nameprop ")) return nameProp(who, engine, trimmed.substring(9).trim());
        } catch (Exception e) {
            Log.logError(e, "Props command \"" + line + "\" by " + who.strName, false);
            return "Something went wrong placing that prop.";
        }
        return null;
    }

    static String nameProp(LivingThing who, DuskEngine engine, String args) throws Exception {
        if (who.privs < GOD_PRIVS) return "Only gods can place props.";
        int bar = args.indexOf('|');
        if (bar < 0) return "Usage: nameprop <prop>|<name>";
        String base = CaseFix.file(DIR, args.substring(0, bar).trim());
        String name = args.substring(bar + 1).trim();
        if (!new File(DIR, base).isFile() || base.endsWith(".dsko")) return "There's no prop called " + base + ".";
        if (name.length() == 0 || name.length() > 40 || name.indexOf('/') >= 0 || name.indexOf('\\') >= 0 || name.startsWith(".") || name.indexOf('|') >= 0)
            return "Pick a name up to 40 letters long, without slashes.";
        File mine = new File(DIR, CaseFix.file(DIR, name));
        if (mine.isFile()) {
            // Placing another George is fine; turning the Guard prop into
            // one isn't.
            String was = lookOf(mine);
            if (was == null && !mine.getName().equalsIgnoreCase(base)) return "There's already a prop called " + mine.getName() + "; pick another name.";
            name = mine.getName();
        } else {
            write(new File(DIR, base), new File(DIR, name), base);
        }
        Prop prop = engine.getProp(name);
        if (prop == null) return "That prop couldn't be made.";
        prop.intLocX = who.intLocX;
        prop.intLocY = who.intLocY;
        engine.vctProps.addElement(prop);
        engine.addDuskObject(prop);
        Log.logEvent(who.strName + " placed " + name + " (a " + base + ") at " + who.intLocX + "," + who.intLocY);
        return "You place " + name + ", who looks like a " + base + ".";
    }

    // A copy of the base prop's file, with "look <base>" before the end.
    static void write(File from, File to, String base) throws Exception {
        StringBuffer out = new StringBuffer();
        BufferedReader r = new BufferedReader(new FileReader(from));
        try {
            String l;
            while ((l = r.readLine()) != null) {
                if (l.equals(".")) break;
                if (l.equalsIgnoreCase("look")) { r.readLine(); continue; }
                out.append(l).append("\n");
            }
        } finally {
            r.close();
        }
        out.append("look\n").append(base).append("\n.\n");
        FileWriter w = new FileWriter(to);
        try {
            w.write(out.toString());
        } finally {
            w.close();
        }
    }

    // The prop a named prop looks like, or null for an ordinary prop.
    static String lookOf(File f) {
        try {
            BufferedReader r = new BufferedReader(new FileReader(f));
            try {
                String l;
                while ((l = r.readLine()) != null && !l.equals(".")) {
                    if (l.equalsIgnoreCase("look")) return r.readLine();
                }
            } finally {
                r.close();
            }
        } catch (Exception e) {
        }
        return null;
    }

    // "George=Villager Man; Military Captain=Guard" for every named prop.
    static String looks() {
        StringBuffer b = new StringBuffer();
        String[] names = new File(DIR).list();
        if (names == null) return "";
        for (int i = 0; i < names.length; i++) {
            if (names[i].startsWith(".") || names[i].endsWith(".dsko")) continue;
            String look = lookOf(new File(DIR, names[i]));
            if (look == null) continue;
            if (b.length() > 0) b.append("; ");
            b.append(names[i]).append("=").append(look);
        }
        return b.toString();
    }
}
