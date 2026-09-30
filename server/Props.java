/*
 * Props with names of their own: a villager called George, a guard called
 * Military Captain. Each is its own prop file, a copy of the prop it looks
 * like with "look <that prop>" added, so it's saved and reloaded like any
 * prop, can have its own conversation (talk/<name>), and the client knows
 * how to draw it.
 *
 *   nameprop <prop>|<name>[|<description>]   (gods) place a prop that
 *                            looks like <prop>, called <name>, on your square
 *   propdesc <id>|<text>     (gods) what "look" says about a prop: kept in
 *                            its prop file, so for a plain prop (every
 *                            statue) it's shared, for a named one its own
 *   prop looks               "Looks: <name>=<prop>; ..." for the client
 *
 * Signs with names ("Bank" rather than "sign"), whose text can be changed:
 *   namesign <name>|<text>   (gods) place a named sign on your square
 *   signname <id>|<name>     (gods) rename a sign
 *   signtext <id>|<text>     (gods) change what a sign says ("<s" saves it)
 * The game's signs file keeps only text and place, so names are kept in
 * "signnames" (x, y, name per sign) and put back at start-up.
 *
 * Tile messages: something said to whoever steps on a square ("Stand here
 * to talk to the teller"), as that square's walk-on script:
 *   tilemsg <speaker>|<text>   (gods) on your square; no speaker, just text
 *   tilemsg clear              (gods) remove the one on your square
 * Tile actions, made in the God tab's tile editor (js/dialogue.js turns
 * rules into the script):
 *   tileget                  "TileAction: <x>_<y>|<base64 of its rules>"
 *                            (empty for none, "!" for another script)
 *   tileset <rules>|<script>|<flag,flag>[|<canmove>|<blocked>]   (base64)
 *                            your square's action; canmove is who may step
 *                            onto it (a defCanMoveScripts expression, empty
 *                            for everyone) and blocked what they're told
 *                            when they can't
 * The rules are kept in tileactions/<x>_<y>.json for editing again.
 * Only scripts it wrote itself (tile messages and actions) are replaced
 * or removed.
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
import java.util.Hashtable;

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
            if (lower.startsWith("tilemsg ")) return tileMessage(who, trimmed.substring(8).trim());
            if (lower.equals("tileget")) return tileGet(who);
            if (lower.startsWith("tileset ")) return tileSet(who, trimmed.substring(8).trim());
            if (lower.startsWith("propdesc ")) return propDesc(who, engine, trimmed.substring(9).trim());
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
        String desc = null;
        int bar2 = name.indexOf('|');
        if (bar2 >= 0) {
            desc = name.substring(bar2 + 1).trim();
            name = name.substring(0, bar2).trim();
        }
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
        if (desc != null && desc.length() > 0) setDescription(new File(DIR, name), desc);
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

    // ---- descriptions ----

    static String propDesc(LivingThing who, DuskEngine engine, String args) throws Exception {
        if (who.privs < GOD_PRIVS) return "Only gods can change descriptions.";
        int bar = args.indexOf('|');
        if (bar < 0 || !Storage.isNumber(args.substring(0, bar).trim())) return "Usage: propdesc <id>|<text>";
        DuskObject o;
        try {
            o = engine.getDuskObject(Integer.parseInt(args.substring(0, bar).trim()));
        } catch (Exception e) {
            o = null;
        }
        if (!(o instanceof Prop) || o instanceof Storage) return "That isn't a prop.";
        String text = args.substring(bar + 1).trim();
        if (text.length() == 0) return "What should it say?";
        File f = new File(DIR, CaseFix.file(DIR, o.strName));
        if (!f.isFile()) return "There's no prop file for " + o.strName + ".";
        setDescription(f, text);
        // Every prop loaded from that file.
        String shown = text.replaceAll("[.\\s]+$", "");
        Object[] props = engine.vctProps.toArray();
        int shared = 0;
        for (int i = 0; i < props.length; i++) {
            Prop p = (Prop) props[i];
            if (p != null && p.strName != null && p.strName.equalsIgnoreCase(o.strName)) { p.strDescription = shown; shared++; }
        }
        text = text.replaceAll("[.\\s]+$", "");
        ((Prop) o).strDescription = text;
        return shared > 1 ? "Every " + o.strName + " (" + shared + " of them) now reads: " + text : o.strName + " now reads: " + text;
    }

    // Replaces (or adds) the description in a prop file.
    static void setDescription(File f, String text) throws Exception {
        StringBuffer out = new StringBuffer();
        BufferedReader r = new BufferedReader(new FileReader(f));
        try {
            String l;
            while ((l = r.readLine()) != null) {
                if (l.equals(".")) break;
                if (l.equalsIgnoreCase("description")) { r.readLine(); continue; }
                out.append(l).append("\n");
            }
        } finally {
            r.close();
        }
        // "look" adds its own full stop.
        out.append("description\n").append(text.replace('\n', ' ').replaceAll("[.\\s]+$", "")).append("\n.\n");
        FileWriter w = new FileWriter(f);
        try {
            w.write(out.toString());
        } finally {
            w.close();
        }
    }

    // ---- tile actions ----

    static final String ACTION_MARK = "#Tile action, made in the God tab.";
    static final String ACTIONS_DIR = "tileactions";

    static String tileGet(LivingThing who) throws Exception {
        if (who.privs < GOD_PRIVS) return "Only gods can edit tile actions.";
        String key = who.intLocX + "_" + who.intLocY;
        File script = new File("defMoveActions", key), rules = new File(ACTIONS_DIR, key + ".json");
        if (rules.isFile() && script.isFile()) return "TileAction: " + key + "|" + java.util.Base64.getEncoder().encodeToString(java.nio.file.Files.readAllBytes(rules.toPath()));
        if (script.isFile() && !editorMade(script)) return "TileAction: " + key + "|!";
        return "TileAction: " + key + "|";
    }

    static String tileSet(LivingThing who, String args) throws Exception {
        if (who.privs < GOD_PRIVS) return "Only gods can edit tile actions.";
        String key = who.intLocX + "_" + who.intLocY;
        File script = new File("defMoveActions", key);
        if (script.isFile() && !editorMade(script)) return "This square already has a walk-on script (a teleport, a trap...); it's left alone. Pick the square next to it.";
        String[] parts = args.split("\\|", -1);
        if (parts.length != 3 && parts.length != 5) return "The tile action didn't arrive whole; try saving again.";
        java.util.Base64.Decoder b64 = java.util.Base64.getDecoder();
        byte[] rules = b64.decode(parts[0].trim()), code = b64.decode(parts[1].trim());
        new File(ACTIONS_DIR).mkdirs();
        Talk.write(new File(ACTIONS_DIR, key + ".json"), rules);
        Talk.write(script, code);
        new File(script.getPath() + ".dsko").delete();
        for (String flag : parts[2].split(",")) {
            flag = flag.trim().toLowerCase();
            if (!flag.matches("[a-z0-9_]{1,40}")) continue;
            File cond = new File("defConditions", flag);
            if (!cond.exists()) Talk.write(cond, "nodisplay\n.\n".getBytes("UTF-8"));
        }
        String note = "";
        if (parts.length == 5) {
            String canMove = new String(b64.decode(parts[3].trim()), "UTF-8").trim();
            String blocked = new String(b64.decode(parts[4].trim()), "UTF-8").trim();
            File cm = new File("defCanMoveScripts", key);
            if (cm.isFile() && !firstLine(cm).equals(WALK_MARK)) {
                if (canMove.length() > 0) note = " (This square already had its own walking rule, so that part was left alone.)";
            } else if (canMove.length() == 0) {
                cm.delete();
            } else {
                Talk.write(cm, (WALK_MARK + "\n" + canMove + "\n").getBytes("UTF-8"));
            }
            new File(cm.getPath() + ".dsko").delete();
            File block = new File(ACTIONS_DIR, key + ".block");
            if (blocked.length() > 0 && canMove.length() > 0) Talk.write(block, blocked.getBytes("UTF-8"));
            else block.delete();
        }
        Log.logEvent(who.strName + " saved the tile action at " + key.replace('_', ','));
        return "Saved the action on " + key.replace('_', ',') + ". Step off and back on to try it (gods walk anywhere, so try walking rules as a player)." + note;
    }

    static final String WALK_MARK = "#Who can step here, made in the God tab.";
    static final Hashtable<String, Long> lastBlocked = new Hashtable<String, Long>();

    // A player couldn't step onto (x, y): if a tile action says why, tell
    // them, when it's a step they tried (not the path-finder looking
    // around), at most every few seconds.
    static void blocked(Player who, int x, int y) {
        try {
            File block = new File(ACTIONS_DIR, x + "_" + y + ".block");
            if (!block.isFile()) return;
            boolean stepping = StackWalker.getInstance().walk(frames -> frames.anyMatch(f -> f.getMethodName().equals("moveTo") || f.getMethodName().equals("changeLoc")));
            if (!stepping) return;
            String k = who.strName + "|" + x + "_" + y;
            long now = System.currentTimeMillis();
            Long last = lastBlocked.get(k);
            if (last != null && now - last.longValue() < 3000) return;
            lastBlocked.put(k, Long.valueOf(now));
            who.chatMessage(new String(java.nio.file.Files.readAllBytes(block.toPath()), "UTF-8").trim());
        } catch (Exception e) {
            Log.logError(e, "Props.blocked", false);
        }
    }

    // A walk-on script made here (a tile message or action), not by hand.
    static boolean editorMade(File f) {
        String first = firstLine(f);
        return first.equals(TILE_MARK) || first.equals(ACTION_MARK);
    }

    // ---- tile messages ----

    static final String TILE_MARK = "#Tile message, placed from the God tab.";

    static String tileMessage(LivingThing who, String args) throws Exception {
        if (who.privs < GOD_PRIVS) return "Only gods can place tile messages.";
        File f = new File("defMoveActions", who.intLocX + "_" + who.intLocY);
        boolean ours = !f.exists() || editorMade(f);
        if (args.equalsIgnoreCase("clear")) {
            if (!f.exists()) return "There's no message on this square.";
            if (!ours) return "This square has a walk-on script that isn't a tile message; it's left alone.";
            f.delete();
            new File(f.getPath() + ".dsko").delete();
            new File(ACTIONS_DIR, who.intLocX + "_" + who.intLocY + ".json").delete();
            new File(ACTIONS_DIR, who.intLocX + "_" + who.intLocY + ".block").delete();
            File cm = new File("defCanMoveScripts", who.intLocX + "_" + who.intLocY);
            if (cm.isFile() && firstLine(cm).equals(WALK_MARK)) { cm.delete(); new File(cm.getPath() + ".dsko").delete(); }
            return "This square's message or action is gone.";
        }
        if (!ours) return "This square already has a walk-on script (a teleport, a trap...); it's left alone. Pick the square next to it.";
        int bar = args.indexOf('|');
        String speaker = (bar < 0 ? "" : args.substring(0, bar)).trim().replace('"', '\'');
        String text = (bar < 0 ? args : args.substring(bar + 1)).trim().replace('"', '\'');
        if (text.length() == 0) return "What should the message say?";
        String say = speaker.length() > 0 ? speaker + " says: " + text : text;
        FileWriter w = new FileWriter(f);
        try {
            w.write(TILE_MARK + "\nchat trigger \"" + say + "\"\nendscript\n");
        } finally {
            w.close();
        }
        new File(f.getPath() + ".dsko").delete();
        Log.logEvent(who.strName + " put a tile message at " + who.intLocX + "," + who.intLocY);
        return "Anyone stepping on " + who.intLocX + "," + who.intLocY + " will see: " + say;
    }

    static String firstLine(File f) {
        try {
            BufferedReader r = new BufferedReader(new FileReader(f));
            try {
                String l = r.readLine();
                return l == null ? "" : l;
            } finally {
                r.close();
            }
        } catch (Exception e) {
            return "";
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
