/*
 * Shared storage: barrels and chests that gods place on the map. Anyone
 * standing on or next to one can look inside, put things in and take them
 * out, and every character sees the same contents. They're saved to the
 * file "storage" after every change, so they survive restarts.
 *
 *   storage                    what's in the storage next to you
 *   storage #<id> [put|take …] the same for one storage by its ID (the
 *                              client uses this for the one clicked on)
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
import java.util.Enumeration;
import java.util.Hashtable;
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
        this.strName = nameFor(kind, label);
        this.strDescription = "A " + kind + " anyone can store things in.";
        this.intImage = kind.equals("chest") ? CHEST_IMAGE : BARREL_IMAGE;
        this.intLocX = x;
        this.intLocY = y;
    }

    // "Guild" makes a "Guild barrel"; a label that already says what it is
    // ("Water Barrel") is used as it is.
    static String nameFor(String kind, String label) {
        if (label == null || label.trim().length() == 0) return kind;
        String l = label.trim();
        return l.toLowerCase().endsWith(kind) ? l : l + " " + kind;
    }

    // Names saved before nameFor lose the doubled kind ("Water Barrel barrel").
    static String tidyName(String kind, String name) {
        String lower = name.toLowerCase();
        if (lower.endsWith(" " + kind + " " + kind)) return name.substring(0, name.length() - kind.length() - 1);
        return name;
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
        boolean box = lower.equals("box") || lower.startsWith("box ");
        if (!(box || lower.equals("storage") || lower.startsWith("storage "))) return null;
        try {
            String reply;
            synchronized (Storage.class) {
                reply = box ? runBox(who, engine, trimmed.substring(3).trim()) : run(who, engine, trimmed.substring(7).trim());
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

        // "#<id>" first picks which storage (the one clicked on in the
        // client); without it, the one here or next to you.
        Storage s;
        if (lower.startsWith("#")) {
            int sp = args.indexOf(' ');
            String id = sp < 0 ? args.substring(1) : args.substring(1, sp);
            args = sp < 0 ? "" : args.substring(sp + 1).trim();
            lower = args.toLowerCase();
            s = isNumber(id) ? byId(Integer.parseInt(id)) : null;
            if (s != null && !(Math.abs(s.intLocX - who.intLocX) <= 1 && Math.abs(s.intLocY - who.intLocY) <= 1)) return "The " + s.strName + " is too far away.";
        } else {
            s = near(who);
        }
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

    static Storage byId(int id) {
        for (int i = 0; i < all.size(); i++) {
            Storage s = (Storage) all.elementAt(i);
            if (s.ID == id) return s;
        }
        return null;
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

    // ---- deposit boxes ----
    //
    // A private box for each player, bought once from a bank teller and
    // reached at any teller (one box, every bank):
    //   box              what's in yours
    //   box buy          buy one (BOX_PRICE gp)
    //   box put <item>   put an item in (inventory ID or name)
    //   box take <item>  take one out (by name)
    // Saved to the game's "boxes" file, like storage.

    static final String BOX_FILE = "boxes";
    static final int BOX_PRICE = 500;
    static final int BOX_SIZE = 40;
    static final int TELLER_REACH = 2;
    static final Hashtable<String, Vector> boxes = new Hashtable<String, Vector>();
    static boolean boxesBroken = false;

    private static String runBox(LivingThing who, DuskEngine engine, String args) throws Exception {
        if (!(who instanceof Player)) return "Only players have deposit boxes.";
        if (boxesBroken) return "The deposit boxes are closed for repairs.";
        if (!nearTeller(who, engine)) return "You can only reach your deposit box at a bank teller.";
        String key = who.strName.toLowerCase();
        Vector box = boxes.get(key);
        String lower = args.toLowerCase();
        if (lower.equals("buy")) {
            if (box != null) return "You already have a deposit box.\n" + boxListing(box);
            if (who.cash < BOX_PRICE) return "A deposit box costs " + BOX_PRICE + " gp, and you're carrying " + who.cash + " gp.";
            // Saved in the order that can't make anything from nothing.
            who.cash -= BOX_PRICE;
            who.savePlayer();
            box = new Vector();
            boxes.put(key, box);
            saveBoxes();
            who.updateStats();
            Log.logEvent(who.strName + " bought a deposit box for " + BOX_PRICE + " gp");
            return "You buy a deposit box for " + BOX_PRICE + " gp. It's yours at every bank.\n" + boxListing(box);
        }
        if (box == null) return "You don't have a deposit box yet. One costs " + BOX_PRICE + " gp.";
        if (lower.length() == 0 || lower.equals("look")) return boxListing(box);
        if (lower.startsWith("put ")) {
            String what = args.substring(4).trim();
            Item item = isNumber(what) ? who.items.getItem(Integer.parseInt(what)) : who.items.getItem(what, 0);
            if (item == null) return "You don't have that.";
            if (item.intCost == 0 || !new File("defItems/" + item.strName.toLowerCase()).exists()) return "The " + item.strName + " can't be stored.";
            if (box.size() >= BOX_SIZE) return "Your deposit box is full.";
            who.items.remove((Object) item);
            who.savePlayer();
            box.addElement(item);
            saveBoxes();
            who.updateItems();
            Log.logEvent(who.strName + " put " + item.strName + " in their deposit box");
            return "You put the " + item.strName + " in your deposit box.\n" + boxListing(box);
        }
        if (lower.startsWith("take ")) {
            String what = args.substring(5).trim();
            Item item = null;
            for (int i = 0; i < box.size() && item == null; i++) {
                Item it = (Item) box.elementAt(i);
                if (it.strName.equalsIgnoreCase(what)) item = it;
            }
            if (item == null) return "Your deposit box doesn't hold a " + what + ".";
            box.removeElement(item);
            saveBoxes();
            who.items.add((Object) item);
            who.savePlayer();
            who.updateItems();
            Log.logEvent(who.strName + " took " + item.strName + " from their deposit box");
            return "You take the " + item.strName + " from your deposit box.\n" + boxListing(box);
        }
        return "Box: look, buy, put <item> or take <item>.";
    }

    // Worded like storage's, so the client reads both the same way.
    static String boxListing(Vector box) {
        if (box.isEmpty()) return "The deposit box is empty.";
        StringBuffer b = new StringBuffer("The deposit box holds " + box.size() + (box.size() == 1 ? " item:" : " items:"));
        for (int i = 0; i < box.size(); i++) b.append("\n- ").append(((Item) box.elementAt(i)).strName);
        return b.toString();
    }

    // A bank teller (a prop whose name has "teller" in it) within reach.
    static boolean nearTeller(LivingThing who, DuskEngine engine) {
        Object[] props = engine.vctProps.toArray();
        for (int i = 0; i < props.length; i++) {
            Prop p = (Prop) props[i];
            if (p == null || p.strName == null || p.strName.toLowerCase().indexOf("teller") < 0) continue;
            if (Math.abs(p.intLocX - who.intLocX) <= TELLER_REACH && Math.abs(p.intLocY - who.intLocY) <= TELLER_REACH) return true;
        }
        return false;
    }

    // Per box: "box1", the owner, the item count, then per item its name,
    // durability and uses.
    static void saveBoxes() throws Exception {
        if (boxesBroken) throw new Exception("boxes file unreadable; not saving over it");
        File tmp = new File(BOX_FILE + ".new");
        FileWriter w = new FileWriter(tmp);
        try {
            for (Enumeration<String> e = boxes.keys(); e.hasMoreElements();) {
                String owner = e.nextElement();
                Vector box = boxes.get(owner);
                w.write("box1\n" + owner + "\n" + box.size() + "\n");
                for (int j = 0; j < box.size(); j++) {
                    Item it = (Item) box.elementAt(j);
                    w.write(it.strName + "\n" + it.lngDurability + "\n" + it.intUses + "\n");
                }
            }
        } finally {
            w.close();
        }
        Files.move(tmp.toPath(), new File(BOX_FILE).toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    static void loadBoxes(DuskEngine engine) {
        File f = new File(BOX_FILE);
        if (!f.exists()) return;
        try {
            BufferedReader r = new BufferedReader(new FileReader(f));
            try {
                String line;
                while ((line = r.readLine()) != null && line.equals("box1")) {
                    String owner = r.readLine();
                    int count = Integer.parseInt(r.readLine());
                    Vector box = new Vector();
                    for (int j = 0; j < count; j++) {
                        String itemName = r.readLine();
                        long durability = Long.parseLong(r.readLine());
                        int uses = Integer.parseInt(r.readLine());
                        Item it = engine.getItem(itemName);
                        if (it == null) {
                            Log.logEvent("Deposit box of " + owner + " lost unknown item " + itemName);
                            continue;
                        }
                        it.lngDurability = durability;
                        it.intUses = uses;
                        box.addElement(it);
                    }
                    boxes.put(owner, box);
                }
            } finally {
                r.close();
            }
            System.out.println("Loaded " + boxes.size() + " deposit boxes.");
        } catch (Exception e) {
            boxesBroken = true;
            Log.logError(e, "Storage.loadBoxes(): the boxes file couldn't be read; saving it as boxes.bad", false);
            try { Files.copy(f.toPath(), new File(BOX_FILE + ".bad").toPath(), StandardCopyOption.REPLACE_EXISTING); } catch (Exception e2) { }
        }
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
        loadBoxes(engine);
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
                    s.strName = tidyName(kind, name);
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
