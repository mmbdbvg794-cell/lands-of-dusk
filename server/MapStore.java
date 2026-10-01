/*
 * The world map each character has explored, kept on the server so it
 * follows them to another browser or device. The client (js/mapsync.js)
 * sends each 32x32 chunk it has seen, compressed, and asks for them all
 * back at login; the server only stores them, never reads them:
 *
 *   mapsave <cx,cy> <data>   store one chunk (no reply)
 *   mapload                  "Map: <cx,cy> <data>" per chunk, then
 *                            "Map: done <count>"
 *
 * One small file per chunk, in explored/<character>/, so a save writes
 * only what changed.
 *
 * And the player's own notes on the world map ("wolves here"), in
 * explored/<character>/notes, a line "<x>|<y>|<text>" each:
 *   mapnotes                 "MapNote: <x>|<y>|<text>" per note, then
 *                            "MapNote: end <count>"
 *   mapnote add <x> <y> <text>
 *   mapnote remove <x> <y>
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.io.FileWriter;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

public class MapStore {
    static final String DIR = "explored";
    static final int MAX_CHUNKS = 6000; // a whole 2000x2000 world is ~4000
    static final int MAX_DATA = 6000;   // a chunk is 2 KB raw, less compressed
    static final int MAX_NOTES = 300;
    static final int MAX_NOTE = 80;

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        if (t.equals("mapnotes") || t.startsWith("mapnote ")) return notes(who, t);
        if (!(t.equals("mapload") || t.startsWith("mapsave "))) return null;
        if (!(who instanceof Player)) return "";
        File dir = dirFor(who);
        if (dir == null) return "";
        try {
            if (t.equals("mapload")) return load(who, dir);
            String[] p = t.split(" ");
            if (p.length != 3 || !p[1].matches("-?\\d{1,4},-?\\d{1,4}") || !p[2].matches("[A-Za-z0-9:_=+/-]{1," + MAX_DATA + "}")) return "";
            dir.mkdirs();
            File f = new File(dir, p[1]);
            if (!f.exists()) {
                String[] have = dir.list();
                if (have != null && have.length >= MAX_CHUNKS) return "";
            }
            File tmp = new File(dir, p[1] + ".new");
            FileWriter w = new FileWriter(tmp);
            try {
                w.write(p[2]);
            } finally {
                w.close();
            }
            Files.move(tmp.toPath(), f.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (Exception e) {
            Log.logError(e, "MapStore \"" + (t.length() > 40 ? t.substring(0, 40) : t) + "\" by " + who.strName, false);
        }
        return "";
    }

    private static String notes(LivingThing who, String t) {
        if (!(who instanceof Player)) return "";
        File dir = dirFor(who);
        if (dir == null) return "Notes can't be kept for this character.";
        File f = new File(dir, "notes");
        try {
            java.util.List<String> lines = f.exists() ? Files.readAllLines(f.toPath(), java.nio.charset.StandardCharsets.UTF_8) : new java.util.ArrayList<String>();
            lines.removeIf(l -> !l.matches("-?\\d+\\|-?\\d+\\|.*"));
            if (t.equals("mapnotes")) {
                for (String l : lines) who.chatMessage("MapNote: " + l);
                return "MapNote: end " + lines.size();
            }
            String[] p = t.substring(8).trim().split("\\s+", 4);
            boolean add = p.length >= 1 && p[0].equals("add");
            if (p.length < 3 || !(add || p[0].equals("remove")) || !p[1].matches("-?\\d{1,5}") || !p[2].matches("-?\\d{1,5}")) return "Usage: mapnote add <x> <y> <text>, mapnote remove <x> <y>";
            String at = p[1] + "|" + p[2] + "|";
            lines.removeIf(l -> l.startsWith(at));
            if (add) {
                String text = p.length >= 4 ? p[3].replace('|', '/').trim() : "";
                if (text.length() == 0) return "Write something for the note.";
                if (text.length() > MAX_NOTE) text = text.substring(0, MAX_NOTE);
                if (lines.size() >= MAX_NOTES) return "You have as many notes as can be kept; remove some first.";
                lines.add(at + text);
            }
            dir.mkdirs();
            StringBuffer b = new StringBuffer();
            for (String l : lines) b.append(l).append('\n');
            Talk.write(f, b.toString().getBytes("UTF-8"));
            return "";
        } catch (Exception e) {
            Log.logError(e, "MapStore notes by " + who.strName, false);
            return "The note couldn't be saved.";
        }
    }

    // explored/<name>, or null for a name that can't be a folder.
    static File dirFor(LivingThing who) {
        String name = who.strName.toLowerCase();
        if (!name.matches("[a-z0-9 _-]{1,40}")) return null;
        return new File(DIR, name);
    }

    // One line per chunk (a chat line each), then the count.
    static String load(LivingThing who, File dir) throws Exception {
        String[] names = dir.list();
        int n = 0;
        if (names != null) {
            for (String k : names) {
                if (!k.matches("-?\\d{1,4},-?\\d{1,4}")) continue;
                String data = new String(Files.readAllBytes(new File(dir, k).toPath()), "UTF-8").trim();
                if (data.length() == 0) continue;
                who.chatMessage("Map: " + k + " " + data);
                n++;
            }
        }
        return "Map: done " + n;
    }
}
