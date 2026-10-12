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
 *   talk          talk to the nearest NPC with something to say, and
 *   talk <name>   to one whose name has that in it: for the old Java
 *                 client, which knows no IDs (its players type the
 *                 answers in brackets, which works as it is)
 *   talk names    which NPCs have something to say (for the client's menu)
 *
 * The God tab's dialogue editor (js/dialogue.js) writes these files for
 * gods, so conversations can be made in the game:
 *   talkedit get <name>   "Dialogue: <name>|<base64 of its .dlg>" (empty
 *                         for none, "!" for a hand-written script)
 *   talkedit set <name>|<dlg>|<script>|<greet>|<flag,flag>   (base64)
 *     writes talk/<name>.dlg (the editor's own copy), talk/<name> and
 *     talk/<name>.greet, and a hidden condition file for each flag the
 *     dialogue uses; a hand-written script it replaces is backed up.
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
        if (lower.startsWith("talkedit ")) return edit(who, line.trim().substring(9).trim());
        if (!(lower.equals("talk") || lower.startsWith("talk "))) return null;
        if (!(who instanceof Player)) return "Only players can talk to people.";
        String arg = lower.substring(4).trim();
        if (arg.equals("names")) return "Talkers: " + join(talkers());
        DuskObject npc;
        if (!Storage.isNumber(arg)) {
            npc = nearest(engine, who, arg);
            if (npc == null) return arg.length() == 0 ? "There's no one to talk to here. Stand next to someone and type: talk"
                : "There's no one called " + arg + " to talk to here.";
        } else {
            try {
                npc = engine.getDuskObject(Integer.parseInt(arg));
            } catch (Exception e) {
                npc = null;
            }
        }
        if (npc == null || npc instanceof Player) return "There's no one like that here.";
        String name = bare(npc.strName);
        // Tellers stand behind counters: they can be talked to from further.
        int reach = Props.isTeller(npc) ? Props.TELLER_REACH : REACH;
        if (Math.abs(npc.intLocX - who.intLocX) > reach || Math.abs(npc.intLocY - who.intLocY) > reach) return "Get closer to talk to " + name + ".";
        String file = scriptFor(npc.strName);
        // A named prop without a script of its own talks like what it looks
        // like (a teller called Gringotts is still a teller).
        if (file == null && npc instanceof Prop) {
            String look = Props.lookOf(new File(Props.DIR, npc.strName));
            if (look != null) file = scriptFor(look);
        }
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

    // ---- the dialogue editor ----

    static final int GOD_PRIVS = 3;

    static String edit(LivingThing who, String args) {
        if (who.privs < GOD_PRIVS) return "Only gods can edit dialogue.";
        try {
            if (args.toLowerCase().startsWith("get ")) {
                String name = args.substring(4).trim();
                if (!safeName(name)) return "That isn't a name an NPC can have.";
                String file = CaseFix.file(DIR, name);
                File dlg = new File(DIR, file + ".dlg");
                if (dlg.isFile()) return "Dialogue: " + name + "|" + java.util.Base64.getEncoder().encodeToString(java.nio.file.Files.readAllBytes(dlg.toPath()));
                return "Dialogue: " + name + "|" + (new File(DIR, file).isFile() ? "!" : "");
            }
            if (args.toLowerCase().startsWith("set ")) {
                String[] parts = args.substring(4).split("\\|", -1);
                if (parts.length != 5) return "The dialogue didn't arrive whole; try saving again.";
                String name = parts[0].trim();
                if (!safeName(name)) return "That isn't a name an NPC can have.";
                java.util.Base64.Decoder b64 = java.util.Base64.getDecoder();
                byte[] dlg = b64.decode(parts[1].trim()), script = b64.decode(parts[2].trim()), greet = b64.decode(parts[3].trim());
                new File(DIR).mkdirs();
                String file = CaseFix.file(DIR, name);
                File scriptFile = new File(DIR, file), dlgFile = new File(DIR, file + ".dlg");
                // A script not made by the editor is kept before it's replaced.
                if (scriptFile.isFile() && !dlgFile.isFile()) {
                    new File("backups").mkdirs();
                    java.nio.file.Files.copy(scriptFile.toPath(), new File("backups", "talk-" + file + "-" + System.currentTimeMillis()).toPath());
                }
                write(dlgFile, dlg);
                write(scriptFile, script);
                File greetFile = new File(DIR, file + ".greet");
                if (greet.length > 0) write(greetFile, greet);
                else greetFile.delete();
                new File(DIR, file + ".dsko").delete();
                for (String flag : parts[4].split(",")) {
                    flag = flag.trim().toLowerCase();
                    if (!flag.matches("[a-z0-9_]{1,40}")) continue;
                    File cond = new File("defConditions", flag);
                    if (!cond.exists()) write(cond, "nodisplay\n.\n".getBytes("UTF-8"));
                }
                Log.logEvent(who.strName + " saved the dialogue of " + file);
                return "Saved " + file + "'s dialogue. Talk to them to try it.";
            }
        } catch (Exception e) {
            Log.logError(e, "talkedit by " + who.strName, false);
            return "The dialogue couldn't be saved.";
        }
        return "Usage: talkedit get <name> | talkedit set ...";
    }

    static boolean safeName(String n) {
        return n.length() > 0 && n.length() <= 40 && n.indexOf('/') < 0 && n.indexOf('\\') < 0 && !n.startsWith(".") && n.indexOf('|') < 0;
    }

    static void write(File f, byte[] data) throws Exception {
        File tmp = new File(f.getPath() + ".new");
        java.nio.file.Files.write(tmp.toPath(), data);
        java.nio.file.Files.move(tmp.toPath(), f.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
    }

    // The talk/ script for an NPC's name, or null.
    // The nearest NPC within reach with a conversation, whose name has
    // `words` in it (any, when empty).
    static DuskObject nearest(DuskEngine engine, LivingThing who, String words) {
        DuskObject best = null;
        int bestD = Integer.MAX_VALUE;
        for (Vector v : new Vector[] { engine.vctProps, engine.vctMobs, engine.vctMerchants }) {
            for (Object o : v.toArray()) {
                DuskObject npc = (DuskObject) o;
                if (npc == null || npc instanceof Player) continue;
                int reach = Props.isTeller(npc) ? Props.TELLER_REACH : REACH;
                int dx = Math.abs(npc.intLocX - who.intLocX), dy = Math.abs(npc.intLocY - who.intLocY);
                if (dx > reach || dy > reach) continue;
                if (words.length() > 0 && bare(npc.strName).toLowerCase().indexOf(words) < 0) continue;
                String file = scriptFor(npc.strName);
                if (file == null && npc instanceof Prop) {
                    String look = Props.lookOf(new File(Props.DIR, npc.strName));
                    if (look != null) file = scriptFor(look);
                }
                if (file == null) continue;
                int d = Math.max(dx, dy);
                if (d < bestD) { best = npc; bestD = d; }
            }
        }
        return best;
    }

    static String scriptFor(String npcName) {
        String name = bare(npcName);
        String file = CaseFix.file(DIR, name);
        if (file.endsWith(".greet") || file.endsWith(".dsko") || file.endsWith(".dlg")) return null;
        return new File(DIR, file).isFile() ? file : null;
    }

    // Names with a talk script, for the client's menu.
    static Vector<String> talkers() {
        Vector<String> out = new Vector<String>();
        String[] names = new File(DIR).list();
        if (names == null) return out;
        for (int i = 0; i < names.length; i++) {
            String n = names[i];
            if (n.startsWith(".") || n.endsWith(".dsko") || n.endsWith(".greet") || n.endsWith(".dlg") || n.endsWith(".new")) continue;
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
