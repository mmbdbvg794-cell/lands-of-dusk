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
 * What NPCs say is written for the browser client ("open the Shop tab",
 * "click it and choose Attack"). Players of the old Java client get the
 * same lines in its words (CLASSIC: the Merchant button, the Attack list,
 * typing wear/use), and the hidden lines the browser reads (an achievement,
 * an invitation) in words, or not at all when words come with them:
 * PlayerPatch calls forClient at the start of Player.chatMessage, which
 * sends nothing when it gives null.
 *
 *   give <npc> ...   NPCs take things in conversation, not by "give"
 *                 (which is for players): next to one with something to
 *                 say, this says so instead of the engine's "give to who?"
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
    static final long SHOUT_EVERY = 60 * 60 * 1000L; // per player, per NPC: once an hour
    static final long TICK = 2000L;

    static final Hashtable<String, Long> lastShout = new Hashtable<String, Long>();
    static final Random random = new Random();

    // ---- commands ----

    public static String command(LivingThing who, DuskEngine engine, String line) {
        if (line == null) return null;
        String lower = line.trim().toLowerCase();
        if (lower.startsWith("talkedit ")) return edit(who, line.trim().substring(9).trim());
        if (lower.startsWith("give ") && who instanceof Player) {
            String[] w = lower.substring(5).trim().split("\\s+");
            // A player by that name gets it as before.
            if (w.length > 0 && w[0].length() > 1 && engine.getPlayer(w[0]) == null) {
                DuskObject npc = nearest(engine, who, w[0]);
                if (npc != null) return "To hand something to " + bare(npc.strName) + ", talk to them (type: talk) and give the answer that offers it, such as \"here it is\". They take it themselves.";
            }
            return null;
        }
        if (!(lower.equals("talk") || lower.startsWith("talk "))) return null;
        if (!(who instanceof Player)) return "Only players can talk to people.";
        String arg = lower.substring(4).trim();
        if (arg.equals("names")) return "Talkers: " + join(talkers());
        DuskObject npc;
        if (!Storage.isNumber(arg)) {
            npc = nearest(engine, who, arg);
            if (npc == null) {
                // Someone a little further off: say who, and how near to go.
                DuskObject far = nearest(engine, who, arg, NEAR);
                if (far != null) return "Get closer to " + bare(far.strName) + " (stand right beside them), then type talk.";
                return arg.length() == 0 ? "There's no one to talk to here. Stand next to someone and type: talk"
                    : "There's no one called " + arg + " to talk to here.";
            }
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

    // ---- the old Java client's words ----

    // Browser words -> the Java client's, in this order (longest first).
    static final String[][] CLASSIC = {
        { "open the Shop tab and press Buy", "press the Merchant button and buy them" },
        { "open the Shop tab", "press the Merchant button" },
        { "see the Shop tab", "press the Merchant button" },
        { "look in the Shop tab", "press the Merchant button" },
        { "Shop tab", "Merchant button" },
        { "click it and choose Attack", "pick it in the Attack list" },
        { "click mob and click attack", "pick it in the Attack list" },
        { "(in your Backpack, press Wear beside each)", "(type wear and the name of each, e.g. wear leather vest; the Equipment button shows what you wear)" },
        { "( In Backpack Click wear next to Item)", "(type wear and the name of each, e.g. wear leather vest; the Equipment button shows what you wear)" },
        { "Eat and drink from your Backpack when you need to", "Eat and drink when you need to (type use and the name, e.g. use water)" },
        { "use them from your Backpack", "type use and the name, e.g. use water" },
        { "press Enter or tap the box at the bottom, then start with", "type in the box at the bottom, starting with" },
    };

    // Lines the browser client reads and hides that go to everyone: for the
    // Java client, in words, or null (not sent) when words come with them.
    static String classicNotice(String t) {
        String s = t.trim();
        int bar = s.indexOf('|');
        if (s.startsWith("Achievement: ") && bar > 0) return "Achievement earned: " + s.substring(13, bar) + " (" + s.substring(bar + 1) + ")";
        if (s.startsWith("DuelInvite: ") || s.startsWith("PartyInvite: ") || s.startsWith("Ship: ") || s.startsWith("Cooldown: ")) return null;
        if (s.startsWith("PartyChat: ") && bar > 0) return "[party] " + s.substring(11, bar) + ": " + s.substring(bar + 1);
        if (s.startsWith("MailNew: ") && bar > 0) return "A letter from " + s.substring(9, bar) + " is waiting for you (letters are read in the browser client).";
        if (s.startsWith("Trade: request ")) return s.substring(15) + " would like to trade (trading is done in the browser client; give works here).";
        if (s.startsWith("Trade: closed ")) return "The trade is off: " + s.substring(14);
        if (s.startsWith("Trade: done ")) return s.substring(12);
        return t;
    }

    // At login (Sex.afterRace), for the Java client's players only.
    public static void classicTip(Player p) {
        try {
            if (BridgedSocket.browser(p.sckConnection)) return;
            p.chatMessage("Tip for the classic client: to speak with someone, stand beside them and type talk. The Help button (under Equipment) lists every command to type.\n");
        } catch (Exception e) {
            // No tip.
        }
    }

    // ---- answers (TalkPatch: every script "input" goes through answer) ----

    // A question ends in its choices: "... (i have them)", "(yes sir/no)".
    static final java.util.regex.Pattern SPOKEN = java.util.regex.Pattern.compile("^(.{1,40}?) (says|asks): .*?\\(([^()]+)\\)\\s*$"); // shouts don't wait for answers
    static final long ASKED_FOR = 30 * 60 * 1000L; // as long as a quiet connection lasts
    static final long HM_WITHIN = 3000L;
    static final String HM = "Talk to me again when you've made up your mind.";
    // Per player (lower-case name): the last NPC line's choices, and when.
    static final Hashtable<String, String[]> asked = new Hashtable<String, String[]>();
    static final Hashtable<String, Long> askedAt = new Hashtable<String, Long>();
    // When a line was taken as a command instead: the NPC's "Hm?" after it isn't said.
    static final Hashtable<String, Long> passedOn = new Hashtable<String, Long>();
    // The last question anyone asked the player, kept after it's answered or
    // has gone (asked is cleared then): who asked, and its choices.
    static final Hashtable<String, String> lastAsker = new Hashtable<String, String>();
    static final Hashtable<String, String[]> lastChoices = new Hashtable<String, String[]>();

    // Instead of the engine's "huh?" (patch.py): a line that's one of the
    // choices of a question no one is waiting on any more (answered, or the
    // conversation has moved on) says so.
    public static String unknown(LivingThing who, String line) {
        try {
            String key = who.strName.toLowerCase();
            String[] choices = lastChoices.get(key);
            String said = line == null ? "" : line.trim().toLowerCase();
            if (choices != null && said.length() > 0) {
                for (String c : choices) {
                    if (c.equals(said)) return "That conversation is over: talk to " + lastAsker.get(key) + " again.";
                }
            }
        } catch (Exception e) {
            // As the engine says it.
        }
        return "huh?";
    }

    // Each NPC line a player gets: its choices are what a script reading the
    // next answer is waiting for (a line without any clears them).
    static void heard(Player p, String text) {
        String key = p.strName.toLowerCase();
        java.util.regex.Matcher m = SPOKEN.matcher(text.trim());
        if (m.matches() && !text.startsWith("\t")) {
            String[] choices = m.group(3).toLowerCase().split("/");
            for (int i = 0; i < choices.length; i++) choices[i] = choices[i].trim();
            asked.put(key, choices);
            askedAt.put(key, System.currentTimeMillis());
            lastAsker.put(key, m.group(1).replaceFirst("^The ", "the "));
            lastChoices.put(key, choices);
        } else if (text.indexOf(" says: ") > 0 || text.indexOf(" asks: ") > 0) {
            asked.remove(key);
        }
    }

    // The line a script's "input" read. A question with choices, answered
    // with none of them, means the player was doing something else ("buy 1
    // water" while the Quartermaster waits): run it as the command it is.
    // The script still gets the line, and its "Hm? ..." isn't said.
    public static String answer(Player p, String line) {
        try {
            if (p == null || line == null) return line;
            String key = p.strName.toLowerCase();
            String[] choices = asked.remove(key);
            Long at = askedAt.remove(key);
            if (choices == null || at == null || System.currentTimeMillis() - at > ASKED_FOR) return line;
            String said = line.trim().toLowerCase();
            if (said.length() == 0 || said.equals("notdead")) return line;
            for (String c : choices) if (c.equals(said)) return line;
            passedOn.put(key, System.currentTimeMillis());
            String reply = Commands.parseCommand(p, p.engGame, line);
            if (reply != null && reply.length() > 0) p.chatMessage(reply + "\n");
        } catch (Exception e) {
            Log.logError(e, "Talk.answer \"" + line + "\"", false);
        }
        return line;
    }

    // A new character's race list (Player.loadRace: the heading, then
    // "\u0003<race>\n" per race): for the Java client, each race with what
    // it adds to the stats ("human: +1 STR, +1 DEX, ..."), as the browser's
    // race buttons show. The name is still what's typed.
    static final String RACES = "Choose one of the following races:";
    static final String[][] RACE_STATS = { { "stre", "STR" }, { "dext", "DEX" }, { "inte", "INT" }, { "cons", "CON" }, { "wisd", "WIS" }, { "hp", "HP" }, { "mp", "MP" } };

    static String raceList(Player p, String text) {
        String[] parts = text.split("\u0003");
        StringBuilder out = new StringBuilder(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            String name = parts[i].trim();
            Race race = p.engGame.getRaceCollection().getRace(name);
            StringBuilder plus = new StringBuilder();
            for (String[] s : RACE_STATS) {
                int n = 0;
                try {
                    if (race != null) n = race.getAttribute(s[0]);
                } catch (Exception e) {
                    // Not in this race's file.
                }
                if (n != 0) plus.append(plus.length() > 0 ? ", " : "").append(n > 0 ? "+" : "").append(n).append(' ').append(s[1]);
            }
            out.append('\u0003').append(name).append(": ").append(plus.length() > 0 ? plus : "no bonuses").append('\n');
        }
        return out.toString();
    }

    public static String forClient(Player p, String text) {
        try {
            if (text == null || p == null) return text;
            Long passed = passedOn.get(p.strName.toLowerCase());
            if (passed != null && text.indexOf(HM) > 0) {
                passedOn.remove(p.strName.toLowerCase());
                if (System.currentTimeMillis() - passed < HM_WITHIN) return null;
            }
            heard(p, text);
            if (BridgedSocket.browser(p.sckConnection)) return text;
            if (text.startsWith(RACES)) return raceList(p, text);
            if (text.indexOf(": ") > 0 && Character.isUpperCase(text.charAt(0))) {
                text = classicNotice(text);
                if (text == null) return null;
            }
            if (text.indexOf("Shop tab") < 0 && text.indexOf("lick") < 0 && text.indexOf("Backpack") < 0 && text.indexOf("press Enter") < 0) return text;
            for (String[] r : CLASSIC) text = text.replace(r[0], r[1]);
        } catch (Exception e) {
            // As it was.
        }
        return text;
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
    static final int NEAR = 6; // how far "get closer" looks

    static DuskObject nearest(DuskEngine engine, LivingThing who, String words) {
        return nearest(engine, who, words, 0);
    }

    // Within talking reach, or (far > 0) within far squares.
    static DuskObject nearest(DuskEngine engine, LivingThing who, String words, int far) {
        DuskObject best = null;
        int bestD = Integer.MAX_VALUE;
        for (Vector v : new Vector[] { engine.vctProps, engine.vctMobs, engine.vctMerchants }) {
            for (Object o : v.toArray()) {
                DuskObject npc = (DuskObject) o;
                if (npc == null || npc instanceof Player) continue;
                int reach = far > 0 ? far : Props.isTeller(npc) ? Props.TELLER_REACH : REACH;
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

    // Whether p can walk to beside x, y in a few steps: in the same room,
    // not on the far side of a wall. (Sight can't tell: town walls and shop
    // counters are the same tile, and the map's see rules cover few tiles.)
    static final int NEAR_STEPS = 8;
    static boolean[] walkable;
    static long walkableRead;

    static boolean walkableTile(int t) {
        long now = System.currentTimeMillis();
        if (walkable == null || now - walkableRead > 10 * 60 * 1000L) {
            boolean[] w = new boolean[1024];
            for (int i = 0; i < w.length; i++) {
                try {
                    java.util.List<String> l = java.nio.file.Files.readAllLines(new File("defTileScripts", String.valueOf(i)).toPath());
                    w[i] = !l.isEmpty() && l.get(0).trim().equalsIgnoreCase("true");
                } catch (Exception e) {
                    w[i] = false;
                }
            }
            walkable = w;
            walkableRead = now;
        }
        return t >= 0 && t < walkable.length && walkable[t];
    }

    static boolean nearOnFoot(DuskEngine engine, LivingThing p, int x, int y) {
        int sx = p.intLocX, sy = p.intLocY;
        java.util.ArrayDeque<int[]> queue = new java.util.ArrayDeque<int[]>();
        java.util.HashSet<Long> seen = new java.util.HashSet<Long>();
        queue.add(new int[] { sx, sy, 0 });
        seen.add(((long) sx << 32) | sy);
        while (!queue.isEmpty()) {
            int[] c = queue.poll();
            if (Math.abs(c[0] - x) <= 1 && Math.abs(c[1] - y) <= 1) return true;
            if (c[2] >= NEAR_STEPS) continue;
            int[][] steps = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } };
            for (int[] d : steps) {
                int nx = c[0] + d[0], ny = c[1] + d[1];
                if (!seen.add(((long) nx << 32) | ny)) continue;
                try {
                    if (!walkableTile(engine.shrMap[nx][ny])) continue;
                } catch (Exception e) {
                    continue;
                }
                queue.add(new int[] { nx, ny, c[2] + 1 });
            }
        }
        return false;
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
                // Only in the same room: a short walk away, not through a wall.
                if (!nearOnFoot(engine, p, npc.intLocX, npc.intLocY)) continue;
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
