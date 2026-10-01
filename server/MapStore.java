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

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
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
