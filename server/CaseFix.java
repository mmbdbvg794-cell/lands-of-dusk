/*
 * Finds a game file whatever the case of its name. The god command "<"
 * lowercases what's typed, but many mob and prop files have capitals
 * ("Cave Dragon", "Armor Shop"), so "<cave dragon" found no file. The
 * patched Commands (server/patch.py) looks names up through here.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;

public class CaseFix {
    // The name of the file in dir matching name, ignoring case (an exact
    // match wins); name itself if there's none.
    public static String file(String dir, String name) {
        if (name == null) return null;
        String n = name.trim();
        if (new File(dir, n).isFile()) return n;
        String[] names = new File(dir).list();
        if (names == null) return n;
        for (int i = 0; i < names.length; i++) {
            if (names[i].endsWith(".dsko")) continue;
            if (names[i].equalsIgnoreCase(n)) return names[i];
        }
        return n;
    }
}
