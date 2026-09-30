/*
 * Shared storage: barrels and chests that gods place on the map. Anyone
 * standing on or next to one can look inside, put things in and take them
 * out, and every character sees the same contents. They're saved to the
 * file "storage" after every change, so they survive restarts.
 *
 *   storage                    what's in the storage next to you
 *   storage put <item>         put an item in (inventory ID or name)
 *   storage take <item>        take an item out (by name)
 *   storage place barrel|chest [label]   (gods) place one here
 *   storage remove             (gods) remove the empty one here
 *   storage list               (gods) every storage and where it is
 *
 * A storage is a Prop, so the client draws it as a prop (type 3) and "get"
 * never picks it up. Commands.parseCommand hands every command to
 * Storage.command first, which returns null for anything that isn't a
 * storage command; DuskServer calls Storage.load at start-up.
 *
 * Part of the browser client project (dusk-browser-client/server); build
 * and install with server/install.sh.
 */
import java.io.File;
import java.io.FileWriter;
import java.io.BufferedReader;
import java.io.FileReader;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.Vector;

public class Storage extends Prop {
    static final String FILE = "storage";
    static final int GOD_PRIVS = 5;
    // Pictures in sprites.gif for the Pixel style (the Painted style draws
    // them by name): the wooden chest item's picture for both.
    static final int CHEST_IMAGE = 77;
    static final int BARREL_IMAGE = 77;

    static final Vector all = new Vector();
    // Set if the file couldn't be read: nothing is saved over it then, and
    // storage stays closed until it's fixed.
    static boolean broken = false;

    String kind; // "barrel" or "chest"
    final Vector contents = new Vector(); // Items

    Storage(DuskEngine engine, String kind, String label, int x, int y) {
        super(engine);
        this.kind = kind;
        this.strName = label == null || label.trim().length() == 0 ? kind : label.trim() + " " + kind;
        this.strDescription = "A " + kind + " anyone can store things in.";
        this.intImage = kind.equals("chest") ? CHEST_IMAGE : BARREL_IMAGE;
        this.intLocX = x;
        this.intLocY = y;
    }

    int capacity() {
        return kind.equals("chest") ? 40 : 20;
    }

    // ---- commands ----

    // The reply to a storage command, or null if the command isn't one.
    public static String command(LivingThing who, DuskEngine engine, String line) {
        if (line == null) return null;
        String trimmed = line.trim();
        String lower = trimmed.toLowerCase();
        if (!(lower.equals("storage") || lower.startsWith("storage "))) return null;
        try {
            String reply;
            synchronized (Storage.class) {
                reply = run(who, engine, trimmed.substring(7).trim());
            }
            // A reply goes out as one text message (opcode 3), which is
            // one line: send all but the last line separately.
            String[] lines = reply.split("\n");
            for (int i = 0; i < lines.length - 1; i++) who.chatMessage(lines[i]);
            return lines[lines.length - 1];
        } catch (Exception e) {
            Log.logError(e, "Storage command \"" + line + "\" by " + who.strName, false);
            return "Something went wrong with the storage.";
        }
    }

    private static String run(LivingThing who, DuskEngine engine, String args) throws Exception {
        if (!(who instanceof Player)) return "Only players can use storage.";
        if (broken) return "The storage is closed for repairs.";
        String lower = args.toLowerCase();
        if (lower.startsWith("place")) return place(who, engine, args.substring(5).trim());
        if (lower.equals("remove")) return remove(who, engine);
        if (lower.equals("list")) return list(who);

        Storage s = near(who);
        if (s == null) return "There's no storage here.";
        if (lower.length() == 0 || lower.equals("look")) return s.listing();
        if (lower.startsWith("put ")) return s.put(who, args.substring(4).trim());
        if (lower.startsWith("take ")) return s.take(who, args.substring(5).trim());
        return "Storage: look, put <item> or take <item>.";
    }

    // The storage on the player's square, else one next to it.
    static Storage near(LivingThing who) {
        Storage best = null;
        for (int i = 0; i < all.size(); i++) {
            Storage s = (Storage) all.elementAt(i);
            int dx = Math.abs(s.intLocX - who.intLocX), dy = Math.abs(s.intLocY - who.intLocY);
            if (dx == 0 && dy == 0) return s;
            if (dx <= 1 && dy <= 1 && best == null) best = s;
        }
        return best;
    }

    static Storage at(int x, int y) {
        for (int i = 0; i < all.size(); i++) {
            Storage s = (Storage) all.elementAt(i);
            if (s.intLocX == x && s.intLocY == y) return s;
        }
        return null;
    }

    // What the client reads: a header line, then one "- name" line per
    // item.
    String listing() {
        if (contents.isEmpty()) return "The " + strName + " is empty.";
        StringBuffer b = new StringBuffer("The " + strName + " holds " + contents.size() + (contents.size() == 1 ? " item:" : " items:"));
        for (int i = 0; i < contents.size(); i++) b.append("\n- ").append(((Item) contents.elementAt(i)).strName);
        return b.toString();
    }

    String put(LivingThing who, String what) throws Exception {
        if (what.length() == 0) return "Put what in the " + strName + "?";
        Item item = isNumber(what) ? who.items.getItem(Integer.parseInt(what)) : who.items.getItem(what, 0);
        if (item == null) return "You don't have that.";
        if (item.intCost == 0) return "The " + item.strName + " can't be stored.";
        if (!new File("defItems/" + item.strName.toLowerCase()).exists()) return "The " + item.strName + " can't be stored.";
        if (contents.size() >= capacity()) return "The " + strName + " is full.";
        // Saved in the order that can't make a copy: if the server stops
        // between the two saves, the item is lost rather than doubled.
        who.items.remove((Object) item);
        who.savePlayer();
        contents.addElement(item);
        save();
        who.updateItems();
        Log.logEvent(who.strName + " put " + item.strName + " in " + strName + " at " + intLocX + "," + intLocY);
        return "You put the " + item.strName + " in the " + strName + ".\n" + listing();
    }

    String take(LivingThing who, String what) throws Exception {
        if (what.length() == 0) return "Take what from the " + strName + "?";
        Item item = null;
        for (int i = 0; i < contents.size() && item == null; i++) {
            Item it = (Item) contents.elementAt(i);
            if (it.strName.equalsIgnoreCase(what)) item = it;
        }
        if (item == null) return "The " + strName + " doesn't hold a " + what + ".";
        contents.removeElement(item);
        save();
        who.items.add((Object) item);
        who.savePlayer();
        who.updateItems();
        Log.logEvent(who.strName + " took " + item.strName + " from " + strName + " at " + intLocX + "," + intLocY);
        return "You take the " + item.strName + " from the " + strName + ".\n" + listing();
    }

    // ---- gods ----

    static String place(LivingThing who, DuskEngine engine, String args) throws Exception {
        if (who.privs < GOD_PRIVS) return "Only gods can place storage.";
        String lower = args.toLowerCase();
        String kind = lower.startsWith("chest") ? "chest" : lower.startsWith("barrel") ? "barrel" : null;
        if (kind == null) return "Place what? storage place barrel|chest [label]";
        if (at(who.intLocX, who.intLocY) != null) return "There's already storage here.";
        Storage s = new Storage(engine, kind, args.substring(kind.length()).trim(), who.intLocX, who.intLocY);
        all.addElement(s);
        engine.addDuskObject(s);
        save();
        Log.logEvent(who.strName + " placed " + s.strName + " at " + s.intLocX + "," + s.intLocY);
        return "You place a " + s.strName + " here.";
    }

    static String remove(LivingThing who, DuskEngine engine) throws Exception {
        if (who.privs < GOD_PRIVS) return "Only gods can remove storage.";
        Storage s = at(who.intLocX, who.intLocY);
        if (s == null) return "There's no storage on this square.";
        if (!s.contents.isEmpty()) return "Empty the " + s.strName + " first.";
        all.removeElement(s);
        engine.removeDuskObject(s);
        save();
        Log.logEvent(who.strName + " removed " + s.strName + " at " + s.intLocX + "," + s.intLocY);
        return "You remove the " + s.strName + ".";
    }

    static String list(LivingThing who) {
        if (who.privs < GOD_PRIVS) return "Only gods can list storage.";
        if (all.isEmpty()) return "No storage has been placed.";
        StringBuffer b = new StringBuffer("Storage:");
        for (int i = 0; i < all.size(); i++) {
            Storage s = (Storage) all.elementAt(i);
            b.append("\n").append(s.strName).append(" at ").append(s.intLocX).append(",").append(s.intLocY)
             .append(": ").append(s.contents.size()).append("/").append(s.capacity());
        }
        return b.toString();
    }

    // ---- saving ----

    // The file: per storage, "storage1", kind, name, x, y, item count, then
    // per item its name, durability and uses. Written to a temporary file
    // and moved into place, so a crash never leaves half a file.
    static void save() throws Exception {
        if (broken) throw new Exception("storage file unreadable; not saving over it");
        File tmp = new File(FILE + ".new");
        FileWriter w = new FileWriter(tmp);
        try {
            for (int i = 0; i < all.size(); i++) {
                Storage s = (Storage) all.elementAt(i);
                w.write("storage1\n" + s.kind + "\n" + s.strName + "\n" + s.intLocX + "\n" + s.intLocY + "\n" + s.contents.size() + "\n");
                for (int j = 0; j < s.contents.size(); j++) {
                    Item it = (Item) s.contents.elementAt(j);
                    w.write(it.strName + "\n" + it.lngDurability + "\n" + it.intUses + "\n");
                }
            }
        } finally {
            w.close();
        }
        Files.move(tmp.toPath(), new File(FILE).toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    public static void load(DuskEngine engine) {
        File f = new File(FILE);
        if (!f.exists()) return;
        System.out.println("Loading Storage...");
        try {
            BufferedReader r = new BufferedReader(new FileReader(f));
            try {
                String line;
                while ((line = r.readLine()) != null && line.equals("storage1")) {
                    String kind = r.readLine(), name = r.readLine();
                    int x = Integer.parseInt(r.readLine()), y = Integer.parseInt(r.readLine());
                    int count = Integer.parseInt(r.readLine());
                    Storage s = new Storage(engine, kind, null, x, y);
                    s.strName = name;
                    for (int j = 0; j < count; j++) {
                        String itemName = r.readLine();
                        long durability = Long.parseLong(r.readLine());
                        int uses = Integer.parseInt(r.readLine());
                        Item it = engine.getItem(itemName);
                        if (it == null) {
                            Log.logEvent("Storage: " + name + " at " + x + "," + y + " lost unknown item " + itemName);
                            continue;
                        }
                        it.lngDurability = durability;
                        it.intUses = uses;
                        s.contents.addElement(it);
                    }
                    all.addElement(s);
                    engine.addDuskObject(s);
                }
            } finally {
                r.close();
            }
            System.out.println("Loaded " + all.size() + " storage.");
        } catch (Exception e) {
            // Keep the file as it was, so nothing is lost by a later save.
            broken = true;
            Log.logError(e, "Storage.load(): the storage file couldn't be read; saving it as storage.bad", false);
            try { Files.copy(f.toPath(), new File(FILE + ".bad").toPath(), StandardCopyOption.REPLACE_EXISTING); } catch (Exception e2) { }
        }
    }

    static boolean isNumber(String s) {
        if (s.length() == 0) return false;
        for (int i = 0; i < s.length(); i++) if (!Character.isDigit(s.charAt(i))) return false;
        return true;
    }
}
