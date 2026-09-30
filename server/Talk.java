/*
 * Talking to NPCs. Any mob, prop or merchant can have a conversation: a
 * script in talk/<name> (the NPC's name, any case), run when a player next
 * to it talks to it, with "trigger" the player (and "npc" the NPC when it's
 * a creature). Scripts can ask and wait for an answer with "input", so a
 * conversation can branch:
 *
 *   chat trigger "Sergeant: Hey you! Training or the world? (training/world)"
 *   input trigger answer
 *   if strequals answer "training"
 *     set trigger locxy 34 22
 *   end
 *
 * The client turns "(a/b)" at the end of a line into buttons (typing the
 * word works too, in any client).
 *
 * An NPC can also call out to players who come near: talk/<name>.greet is
 * plain text, one line per thing it might shout, and it shouts one of them
 * at a player within a few squares, at most every few minutes each.
 *
 *   talk <id>     talk to the NPC with that ID
 *   talk names    which NPCs have something to say (for the client's menu)
 *
 * Commands.parseCommand hands commands here after Storage; DuskServer
 * calls Talk.start after the engine starts.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.Hashtable;
import java.util.Random;
import java.util.Vector;

public class Talk {
    static final String DIR = "talk";
    static final int REACH = 2;             // squares away you can talk from
    static final int SHOUT_RANGE = 4;       // squares away an NPC calls out to you
    static final long SHOUT_EVERY = 5 * 60 * 1000L; // per player, per NPC
    static final long TICK = 2000L;

    static final Hashtable<String, Long> lastShout = new Hashtable<String, Long>();
    static final Random random = new Random();

    // ---- commands ----

    public static String command(LivingThing who, DuskEngine engine, String line) {
        if (line == null) return null;
        String lower = line.trim().toLowerCase();
        if (!(lower.equals("talk") || lower.startsWith("talk "))) return null;
        if (!(who instanceof Player)) return "Only players can talk to people.";
        String arg = lower.substring(4).trim();
        if (arg.equals("names")) return "Talkers: " + join(talkers());
        if (arg.length() == 0 || !Storage.isNumber(arg)) return "Talk to whom? Click someone and choose Talk.";
        DuskObject npc;
        try {
            npc = engine.getDuskObject(Integer.parseInt(arg));
        } catch (Exception e) {
            npc = null;
        }
        if (npc == null || npc instanceof Player) return "There's no one like that here.";
        String name = bare(npc.strName);
        if (Math.abs(npc.intLocX - who.intLocX) > REACH || Math.abs(npc.intLocY - who.intLocY) > REACH) return "Get closer to talk to " + name + ".";
        String file = scriptFor(npc.strName);
        if (file == null) return name + " has nothing to say.";
        try {
            // Recompiled when the script is newer than its .dsko, so an
            // edited conversation takes effect at once.
            File src = new File(DIR, file), compiled = new File(DIR, file + ".dsko");
            boolean stale = !compiled.exists() || src.lastModified() > compiled.lastModified();
            Script script = new Script(DIR + "/" + file, engine, stale);
            script.varVariables.addVariable("trigger", who);
            if (npc instanceof LivingThing) script.varVariables.addVariable("npc", npc);
            script.runScript();
            script.close();
            // A script can hand over to a built-in afterwards by setting
            // "then": the teller's "box" opens the player's deposit box.
            Variable then = script.varVariables.getVariable("then");
            if (then != null && "box".equals(String.valueOf(then.objData).toLowerCase())) {
                String reply = Storage.command(who, engine, "box");
                return reply == null ? "" : reply;
            }
        } catch (Exception e) {
            Log.logError(e, "Talk script " + file + " for " + who.strName, false);
            return name + " seems lost for words.";
        }
        return "";
    }

    // The talk/ script for an NPC's name, or null.
    static String scriptFor(String npcName) {
        String name = bare(npcName);
        String file = CaseFix.file(DIR, name);
        if (file.endsWith(".greet") || file.endsWith(".dsko")) return null;
        return new File(DIR, file).isFile() ? file : null;
    }

    // Names with a talk script, for the client's menu.
    static Vector<String> talkers() {
        Vector<String> out = new Vector<String>();
        String[] names = new File(DIR).list();
        if (names == null) return out;
        for (int i = 0; i < names.length; i++) {
            String n = names[i];
            if (n.startsWith(".") || n.endsWith(".dsko") || n.endsWith(".greet")) continue;
            out.addElement(n);
        }
        return out;
    }

    // ---- calling out to players nearby ----

    public static void start(final DuskEngine engine) {
        new File(DIR).mkdirs();
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        Thread.sleep(TICK);
                        shout(engine);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Talk.shout", false);
                    }
                }
            }
        }, "Talk");
        t.setDaemon(true);
        t.start();
    }

    static void shout(DuskEngine engine) throws Exception {
        Hashtable<String, Vector<String>> greets = readGreets();
        if (greets.isEmpty()) return;
        Vector<DuskObject> npcs = new Vector<DuskObject>();
        for (Vector v : new Vector[] { engine.vctProps, engine.vctMobs, engine.vctMerchants }) {
            Object[] all = v.toArray();
            for (int i = 0; i < all.length; i++) {
                DuskObject o = (DuskObject) all[i];
                if (o != null && greets.containsKey(bare(o.strName).toLowerCase())) npcs.addElement(o);
            }
        }
        if (npcs.isEmpty()) return;
        Object[] players = engine.vctSockets.toArray();
        long now = System.currentTimeMillis();
        for (int i = 0; i < players.length; i++) {
            Player p = (Player) players[i];
            if (!p.blnWorking) continue;
            for (int j = 0; j < npcs.size(); j++) {
                DuskObject npc = npcs.elementAt(j);
                if (Math.abs(npc.intLocX - p.intLocX) > SHOUT_RANGE || Math.abs(npc.intLocY - p.intLocY) > SHOUT_RANGE) continue;
                String key = p.strName + "|" + npc.ID;
                Long last = lastShout.get(key);
                if (last != null && now - last.longValue() < SHOUT_EVERY) continue;
                lastShout.put(key, Long.valueOf(now));
                Vector<String> lines = greets.get(bare(npc.strName).toLowerCase());
                p.chatMessage(bare(npc.strName) + " shouts: " + lines.elementAt(random.nextInt(lines.size())));
            }
        }
    }

    // talk/<name>.greet files: lower-case NPC name -> its lines.
    static Hashtable<String, Vector<String>> readGreets() throws Exception {
        Hashtable<String, Vector<String>> out = new Hashtable<String, Vector<String>>();
        String[] names = new File(DIR).list();
        if (names == null) return out;
        for (int i = 0; i < names.length; i++) {
            if (!names[i].endsWith(".greet")) continue;
            Vector<String> lines = new Vector<String>();
            BufferedReader r = new BufferedReader(new FileReader(new File(DIR, names[i])));
            try {
                String l;
                while ((l = r.readLine()) != null) if (l.trim().length() > 0 && !l.startsWith("#")) lines.addElement(l.trim());
            } finally {
                r.close();
            }
            if (!lines.isEmpty()) out.put(names[i].substring(0, names[i].length() - 6).toLowerCase(), lines);
        }
        return out;
    }

    // A name without the <clan>/<flag> prefixes the server adds.
    static String bare(String name) {
        String n = name == null ? "" : name;
        while (n.startsWith("<") && n.indexOf('>') > 0) n = n.substring(n.indexOf('>') + 1);
        return n;
    }

    static String join(Vector<String> v) {
        StringBuffer b = new StringBuffer();
        for (int i = 0; i < v.size(); i++) b.append(i > 0 ? ", " : "").append(v.elementAt(i));
        return b.toString();
    }
}
