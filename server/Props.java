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
 * Signs with names ("Bank" rather than "sign"), whose text can be changed:
 *   namesign <name>|<text>   (gods) place a named sign on your square
 *   signname <id>|<name>     (gods) rename a sign
 *   signtext <id>|<text>     (gods) change what a sign says ("<s" saves it)
 * The game's signs file keeps only text and place, so names are kept in
 * "signnames" (x, y, name per sign) and put back at start-up.
 *
 * Bank tellers (a name, or the look of a named prop, with "teller" in it)
 * can be used from TELLER_REACH squares, since they stand behind counters.
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
            if (lower.startsWith("namesign ")) return nameSign(who, engine, trimmed.substring(9).trim());
            if (lower.startsWith("signname ")) return editSign(who, engine, trimmed.substring(9).trim(), true);
            if (lower.startsWith("signtext ")) return editSign(who, engine, trimmed.substring(9).trim(), false);
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

    // ---- signs ----

    static final String SIGN_NAMES = "signnames";

    static String nameSign(LivingThing who, DuskEngine engine, String args) throws Exception {
        if (who.privs < GOD_PRIVS) return "Only gods can place signs.";
        int bar = args.indexOf('|');
        String name = bar < 0 ? "" : args.substring(0, bar).trim();
        String text = bar < 0 ? args : args.substring(bar + 1).trim();
        if (text.length() == 0) return "What should the sign say?";
        if (name.length() == 0) name = "sign";
        if (name.length() > 40) return "Pick a name up to 40 letters long.";
        Sign sign = new Sign(name, text, who.intLocX, who.intLocY, engine);
        engine.vctSigns.addElement(sign);
        engine.addDuskObject(sign);
        saveSignNames(engine);
        Log.logEvent(who.strName + " placed the sign " + name + " at " + who.intLocX + "," + who.intLocY);
        return "You place the " + name + " sign. Save the map to keep what it says.";
    }

    static String editSign(LivingThing who, DuskEngine engine, String args, boolean rename) throws Exception {
        if (who.privs < GOD_PRIVS) return "Only gods can change signs.";
        int bar = args.indexOf('|');
        if (bar < 0 || !Storage.isNumber(args.substring(0, bar).trim())) return rename ? "Usage: signname <id>|<name>" : "Usage: signtext <id>|<text>";
        DuskObject o;
        try {
            o = engine.getDuskObject(Integer.parseInt(args.substring(0, bar).trim()));
        } catch (Exception e) {
            o = null;
        }
        if (!(o instanceof Sign)) return "That isn't a sign.";
        Sign sign = (Sign) o;
        String value = args.substring(bar + 1).trim();
        if (value.length() == 0) return rename ? "What should the sign be called?" : "What should the sign say?";
        if (rename) {
            if (value.length() > 40) return "Pick a name up to 40 letters long.";
            sign.strName = value;
            saveSignNames(engine);
            // Show the new name to everyone who can see it.
            engine.removeEntity(sign);
            engine.addEntity(sign);
            return "The sign is now called " + value + ".";
        }
        sign.strMessage = value;
        return "The sign now says: " + value + ". Save the map to keep it.";
    }

    // Every sign that isn't plain "sign": x, y and name, three lines each.
    static void saveSignNames(DuskEngine engine) throws Exception {
        StringBuffer b = new StringBuffer();
        Object[] signs = engine.vctSigns.toArray();
        for (int i = 0; i < signs.length; i++) {
            Sign s = (Sign) signs[i];
            if (s == null || s.strName == null || s.strName.equals("sign")) continue;
            b.append(s.intLocX).append("\n").append(s.intLocY).append("\n").append(s.strName).append("\n");
        }
        File tmp = new File(SIGN_NAMES + ".new");
        FileWriter w = new FileWriter(tmp);
        try {
            w.write(b.toString());
        } finally {
            w.close();
        }
        java.nio.file.Files.move(tmp.toPath(), new File(SIGN_NAMES).toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
    }

    // Puts the names back on the signs loaded at start-up.
    public static void loadSignNames(DuskEngine engine) {
        File f = new File(SIGN_NAMES);
        if (!f.exists()) return;
        try {
            BufferedReader r = new BufferedReader(new FileReader(f));
            try {
                Object[] signs = engine.vctSigns.toArray();
                String xs;
                while ((xs = r.readLine()) != null && xs.length() > 0) {
                    int x = Integer.parseInt(xs.trim()), y = Integer.parseInt(r.readLine().trim());
                    String name = r.readLine();
                    for (int i = 0; i < signs.length; i++) {
                        Sign s = (Sign) signs[i];
                        if (s.intLocX == x && s.intLocY == y) s.strName = name;
                    }
                }
            } finally {
                r.close();
            }
        } catch (Exception e) {
            Log.logError(e, "Props.loadSignNames", false);
        }
    }

    // ---- tellers ----

    static final int TELLER_REACH = 5;

    // A bank teller: "teller" in its name, or in the look of a named prop.
    static boolean isTeller(DuskObject o) {
        if (o == null || o.strName == null) return false;
        if (o.strName.toLowerCase().indexOf("teller") >= 0) return true;
        if (!(o instanceof Prop)) return false;
        String look = lookOf(new File(DIR, o.strName));
        return look != null && look.toLowerCase().indexOf("teller") >= 0;
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
