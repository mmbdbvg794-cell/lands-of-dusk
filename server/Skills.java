/*
 * Training and skills that work:
 *
 * Stats are trained by their full names: trainers offer Strength,
 * Intelligence, Dexterity, Constitution and Wisdom (and HP, MP), and
 * statFor() turns those into the server's stat codes (stre, inte, dext,
 * cons, wisd) before Merchant.train sees them. Before, "Strength" wasn't
 * a stat code, so training it made a useless skill called Strength;
 * "Stamina" isn't a stat at all. At start-up every trainer's list is put
 * right (Strength and Stamina out, the five stats in), and players who
 * trained the old ones get their points back: Strength as STR, Stamina as
 * the experience it cost.
 *
 * Skills that did nothing now do something, every TICK_MS (the same as the
 * server's own healing):
 *   Regeneration   extra HP healing: at 100, double the natural rate (out
 *                  of battle), and half that in battle
 *   Mana Regen     the same for MP (by WIS)
 *   Spell Power    spells cost less MP: at 100, half (cast() refunds it)
 *   Lock Picking   a chance to open a locked chest without its key (see
 *                  Storage.pick)
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Map;

public class Skills {
    static final int TICK_MS = 18000;
    static final String[][] STATS = {
        { "Strength", "stre" }, { "Intelligence", "inte" }, { "Dexterity", "dext" }, { "Constitution", "cons" }, { "Wisdom", "wisd" },
    };

    // A trainer's ware name -> what Merchant.train should raise.
    public static String statFor(String name) {
        if (name == null) return null;
        String n = name.trim().toLowerCase();
        for (String[] s : STATS) if (n.equals(s[0].toLowerCase()) || n.equals(s[1]) || n.equals(s[1].substring(0, 3))) return s[1];
        return name;
    }

    // Setting someone's respawn point from a script. The script language's
    // own "set trigger bindlocx" stores 0 in this server, so scripts give
    // the player the hidden condition bindnow and then
    //   order trigger "bindat <x> <y>"
    // which comes here: it only works with that condition (which players
    // can't give themselves), and takes it away.
    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        if (!t.toLowerCase().startsWith("bindat ")) return null;
        if (!who.hasCondition(BIND_FLAG)) return "";
        who.removeCondition(BIND_FLAG);
        String[] p = t.substring(7).trim().split("\\s+");
        if (p.length != 2 || !p[0].matches("-?\\d{1,5}") || !p[1].matches("-?\\d{1,5}")) return "";
        who.bindLocX = Integer.parseInt(p[0]);
        who.bindLocY = Integer.parseInt(p[1]);
        try {
            if (who instanceof Player) ((Player) who).savePlayer();
        } catch (Exception e) {
            // Saved later.
        }
        return "";
    }

    static final String BIND_FLAG = "bindnow";

    public static void start(final DuskEngine engine) {
        // The hidden condition the bind effect uses.
        try {
            java.io.File cond = new java.io.File("defConditions", BIND_FLAG);
            if (!cond.exists()) Talk.write(cond, "nodisplay\n.\n".getBytes("UTF-8"));
        } catch (Exception e) {
            Log.logError(e, "Skills: making defConditions/" + BIND_FLAG, false);
        }
        // Ferries have their own clock (server/Ferry.java).
        Ferry.start(engine);
        // Who's online, for the web page (server/Who.java).
        Who.start(engine);
        // Flag timers for conversations (server/Quests.java).
        Quests.start(engine);
        // Conditions wearing off and ticking (server/Conditions.java).
        Conditions.start(engine);
        // The leaderboard, for the web page (server/Admin.java).
        Admin.start(engine);
        // Houses to rent (server/Housing.java).
        Housing.start(engine);
        // Creatures wander, hunt and flee (server/Creatures.java).
        Creatures.start(engine);
        try {
            fixTrainers(engine);
        } catch (Exception e) {
            Log.logError(e, "Skills.fixTrainers", false);
        }
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        Thread.sleep(TICK_MS);
                        Object[] players = engine.vctSockets.toArray();
                        for (Object o : players) {
                            LivingThing p = (LivingThing) o;
                            convert(engine, p);
                            regen(p);
                        }
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Skills tick", false);
                    }
                }
            }
        }, "Skills");
        t.setDaemon(true);
        t.start();
    }

    // Every trainer that offered Strength or Stamina offers the five stats
    // by name instead.
    static void fixTrainers(DuskEngine engine) {
        int fixed = 0;
        for (Object o : engine.vctMerchants.toArray()) {
            Merchant m = (Merchant) o;
            List<String> wares = new ArrayList<String>();
            for (Enumeration e = m.getAllItems(); e.hasMoreElements();) wares.add(String.valueOf(e.nextElement()));
            boolean stats = false;
            for (String w : wares) {
                String l = w.toLowerCase();
                if (!l.startsWith("train:")) continue;
                String what = l.substring(6).trim();
                boolean stat = what.equals("strength") || what.equals("stamina");
                for (String[] s : STATS) if (what.equals(s[0].toLowerCase()) || what.equals(s[1]) || what.equals(s[1].substring(0, 3))) stat = true;
                if (stat) {
                    m.remove(w);
                    stats = true;
                }
            }
            if (stats) {
                for (String[] s : STATS) m.add("train:" + s[0]);
                fixed++;
            }
        }
        if (fixed > 0) Log.logEvent("Skills: trainers now teach Strength, Intelligence, Dexterity, Constitution and Wisdom (" + fixed + " trainers)");
    }

    // Old Strength and Stamina "skills" become what they were paid for.
    static void convert(DuskEngine engine, LivingThing p) {
        int str = 0, stamina = 0;
        synchronized (p.skillTable) {
            for (Object k : p.skillTable.keySet().toArray()) {
                String key = String.valueOf(k);
                Skill s = (Skill) p.skillTable.get(k);
                if (s == null) continue;
                if (key.equalsIgnoreCase("strength")) { str += s.value; p.skillTable.remove(k); }
                else if (key.equalsIgnoreCase("stamina")) { stamina += s.value; p.skillTable.remove(k); }
            }
        }
        if (str == 0 && stamina == 0) return;
        StringBuffer said = new StringBuffer();
        if (str > 0) {
            p.attributes.raiseStat("stre", str);
            said.append("Your Strength training now counts as STR: +").append(str).append(" STR. ");
        }
        if (stamina > 0) {
            long refund = (long) engine.traincost * stamina;
            p.exp += refund;
            said.append("Stamina training did nothing, so its ").append(refund).append(" exp has been given back.");
        }
        try {
            p.savePlayer();
            p.updateStats();
            p.updateInfo();
        } catch (Exception e) {
            // Saved on the next tick or logout.
        }
        p.chatMessage(said.toString().trim());
        Log.logEvent("Skills: converted " + p.strName + "'s old skills (Strength " + str + ", Stamina " + stamina + ")");
    }

    // Regeneration and Mana Regen: extra healing on the server's own rhythm.
    static void regen(LivingThing p) {
        int hp = p.attributes.getStat("hp");
        if (hp <= 0) return;
        boolean fighting = p.batBattle != null;
        int r = p.getSkill("Regeneration");
        if (r > 0) {
            int cons = p.attributes.getStat("cons") + p.attributes.getStat(2, "consbon");
            int base = p.blnSleep ? 3 + cons : 1 + cons / 2;
            int extra = (int) Math.ceil(base * r / 100.0 / (fighting ? 2 : 1));
            int max = p.attributes.getStat("maxhp") + p.attributes.getStat(2, "hpbon");
            if (extra > 0 && hp < max) p.attributes.setStat("hp", Math.min(max, hp + extra));
        }
        int m = p.getSkill("Mana Regen");
        if (m > 0) {
            int wisd = p.attributes.getStat("wisd") + p.attributes.getStat(2, "wisdbon");
            int base = p.blnSleep ? 3 + wisd : 1 + wisd / 2;
            int extra = (int) Math.ceil(base * m / 100.0 / (fighting ? 2 : 1));
            int mp = p.attributes.getStat("mp");
            int max = p.attributes.getStat("maxmp") + p.attributes.getStat(2, "mpbon");
            if (extra > 0 && mp < max) p.attributes.setStat("mp", Math.min(max, mp + extra));
        }
        if (r > 0 || m > 0) {
            try {
                p.updateInfo();
            } catch (Exception e) {
                // Gone.
            }
        }
    }

    // Called first thing as a player logs out or drops (PlayerPatch.java):
    // saved while they still count as working, which close() itself
    // forgot to do.
    public static void beforeClose(Player p, boolean save) {
        if (!save || !p.blnWorking) return;
        try {
            p.savePlayer();
        } catch (Exception e) {
            Log.logError(e, "Saving " + p.strName + " at logout", false);
        }
    }

    // Whether someone wears an item (the patched Equipment.isWearing,
    // server/EquipmentPatch.java): by its name, any case, as the old
    // scripts ask ("gasmask"); or by its ID, as the engine did.
    public static boolean isWearing(Equipment e, String what) {
        if (e == null || what == null) return false;
        String w = what.trim();
        if (w.startsWith("\"") && w.endsWith("\"") && w.length() > 1) w = w.substring(1, w.length() - 1);
        boolean number = w.matches("-?\\d+");
        for (int i = 0; i < 9; i++) {
            Item item;
            try {
                item = e.getItem(i);
            } catch (Exception ex) {
                break;
            }
            if (item == null) continue;
            if (number ? item.ID == Integer.parseInt(w) : w.equalsIgnoreCase(item.strName)) return true;
        }
        return false;
    }

    // What using an item is called (the patched LivingThing.useItem,
    // server/LivingThingPatch.java): "You use the crystal box".
    // The game's food and drink are plain items, so: food and drink types
    // first, then what the use script does (takes away thirst or hunger),
    // then the name; anything else (a box, a book, a scroll) is used.
    public static String useVerb(Item item) {
        if (item == null) return "use";
        if (item.intType == 3) return "eat";
        if (item.intType == 4) return "drink";
        String script = useScriptText(item.strOnUseScript);
        if (script.contains("nothirst")) return "drink";
        if (script.contains("nohunger")) return "eat";
        String n = item.strName == null ? "" : item.strName.toLowerCase();
        if (n.matches(".*\\b(potion|water|ale|beer|wine|mead|milk|juice|tea|brew|elixir|tonic|draught)\\b.*")) return "drink";
        if (n.matches(".*\\b(apple|bread|loaf|sandwich|mushroom|meat|fish|cake|pie|cheese|berry|berries|stew|carrot|egg|food|jerky|biscuit)\\b.*")) return "eat";
        return "use";
    }

    static final Map<String, String> useScripts = new java.util.concurrent.ConcurrentHashMap<String, String>();

    // A use script's text, lower case ("" if there's none); kept, as
    // scripts rarely change and this runs on every use.
    static String useScriptText(String name) {
        if (name == null) return "";
        return useScripts.computeIfAbsent(name, k -> {
            try {
                return new String(java.nio.file.Files.readAllBytes(new java.io.File("scripts", k).toPath()), "ISO-8859-1").toLowerCase();
            } catch (Exception e) {
                return "";
            }
        });
    }

    // A spell cast (the "cast" command): Spell Power gives back part of
    // the MP it cost.
    public static void cast(LivingThing who, String spell) {
        spell = telepathMessage(spell);
        // Cooldowns (gods don't wait): the wait after any spell, and the
        // spell's own.
        String name = spellName(spell);
        boolean waits = who.privs < 3 && name != null;
        String me = who.strName == null ? "" : who.strName.toLowerCase();
        long now = System.currentTimeMillis();
        if (waits) {
            Long any = readyAt.get(me + "|*");
            if (any != null && any > now) {
                who.chatMessage("You are still gathering your power (" + secs(any - now) + ").\n");
                return;
            }
            Long own = readyAt.get(me + "|" + name);
            if (own != null && own > now) {
                who.chatMessage(cap(name) + " is ready again in " + secs(own - now) + ".\n");
                return;
            }
        }
        int before = who.attributes.getStat("mp");
        who.castSpell(spell);
        int cost = before - who.attributes.getStat("mp");
        // Cast (it cost MP): the waits start, and the client is told, to
        // grey the spell out (js/spells.js parseCooldown).
        if (waits && cost > 0) {
            int any = cooldown("*", 2), own = cooldown(name, 0);
            readyAt.put(me + "|*", now + any * 1000L);
            if (own > 0) readyAt.put(me + "|" + name, now + own * 1000L);
            // Only to the web client: in the Java client it would be a stray line.
            if (who instanceof Player && ((Player) who).sckConnection instanceof BridgedSocket) who.chatMessage("Cooldown: " + name + "|" + own + "|" + any + "\n");
        }
        int power = who.getSkill("Spell Power");
        if (cost <= 0 || power <= 0) return;
        int refund = cost * Math.min(100, power) / 200;
        if (refund <= 0) return;
        who.attributes.raiseStat("mp", refund);
        try {
            who.updateInfo();
        } catch (Exception e) {
            // Gone.
        }
    }

    // "telepath <name> a message of several words": the server splits a
    // spell's words into params, so only the first word arrived. Quoted,
    // the whole message is one param.
    static String telepathMessage(String spell) {
        String t = spell.trim();
        if (!t.toLowerCase().startsWith("telepath ")) return spell;
        String[] p = t.split("\\s+", 3);
        if (p.length < 3 || p[2].startsWith("\"")) return spell;
        return p[0] + " " + p[1] + " \"" + p[2].replace("\"", "'") + "\"";
    }

    // ---- spell cooldowns ----
    // The "spellcooldowns" file in the game directory: "<spell>|<seconds>"
    // a line, "*" being the wait after any spell. Made with these defaults
    // if it isn't there, and read again whenever it changes.
    static final String COOLDOWNS = "spellcooldowns";
    static final String DEFAULT_COOLDOWNS =
        "#Seconds before a spell can be cast again (gods don't wait): <spell>|<seconds>.\n"
        + "#\"*\" is the wait after any spell. Changes take effect at once.\n"
        + "*|2\n"
        + "#Damage\nbone shards|3\nthorns|3\nangel strike|4\nsummon snakes|5\nquake|6\ncorrupt|8\nsummon bahamut|10\nholy|12\nsummon wurm|15\nsummon leviathan|20\nsummon ultima bahamut|120\n"
        + "#Healing\nmend|3\nhealing staff|3\nmeditation|8\nregenerate|30\n"
        + "#Lasting effects\narmor|20\nbless|20\nfocus|20\ndetect invis|10\ninvis|30\ncamoflauge|30\nreflect|30\ncurse|10\ntire|15\nprayer|15\n"
        + "#Other\nwarp|120\nquarter staff|5\n";
    static final java.util.Map<String, Long> readyAt = new java.util.concurrent.ConcurrentHashMap<String, Long>();
    static java.util.Map<String, Integer> cooldowns = new java.util.HashMap<String, Integer>();
    static long cooldownsRead = -1;
    static String[] spells = new String[0];

    static synchronized void loadCooldowns() {
        java.io.File f = new java.io.File(COOLDOWNS);
        try {
            if (!f.exists()) Talk.write(f, DEFAULT_COOLDOWNS.getBytes("UTF-8"));
            if (f.lastModified() == cooldownsRead) return;
            java.util.Map<String, Integer> m = new java.util.HashMap<String, Integer>();
            for (String line : java.nio.file.Files.readAllLines(f.toPath())) {
                if (line.startsWith("#")) continue;
                String[] p = line.split("\\|");
                if (p.length == 2 && p[1].trim().matches("\\d{1,5}")) m.put(p[0].trim().toLowerCase(), Integer.parseInt(p[1].trim()));
            }
            cooldowns = m;
            cooldownsRead = f.lastModified();
            String[] names = new java.io.File("defSpells").list();
            spells = names == null ? new String[0] : names;
        } catch (Exception e) {
            Log.logError(e, "Reading " + COOLDOWNS, false);
        }
    }

    static int cooldown(String spell, int otherwise) {
        loadCooldowns();
        Integer n = cooldowns.get(spell);
        return n == null ? otherwise : n;
    }

    // The spell a "cast" names: quoted, or the longest spell name it starts with.
    static String spellName(String spell) {
        loadCooldowns();
        String t = spell.trim().toLowerCase();
        if (t.startsWith("\"")) {
            int end = t.indexOf('"', 1);
            return end > 1 ? t.substring(1, end) : null;
        }
        String best = null;
        for (String s : spells) {
            String n = s.toLowerCase();
            if (n.endsWith(".dsko")) continue;
            if ((t.equals(n) || t.startsWith(n + " ")) && (best == null || n.length() > best.length())) best = n;
        }
        return best;
    }

    static String secs(long ms) {
        long s = (ms + 999) / 1000;
        return s + (s == 1 ? " second" : " seconds");
    }

    static String cap(String s) {
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
