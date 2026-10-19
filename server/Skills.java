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
 *   (any class)    out of battle, a share of max MP on top ("mpregen" in
 *                  the classes file), so a bigger bar refills in about
 *                  the same time
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
        if (n.equals("hp") || n.equals("health")) return "hp";
        if (n.equals("mp") || n.equals("mana")) return "mp";
        return name;
    }

    // A stat's or skill's name to show: "Strength", "Dodge".
    static String label(String what) {
        for (String[] st : STATS) if (st[1].equals(what)) return st[0];
        return what.isEmpty() ? what : Character.toUpperCase(what.charAt(0)) + what.substring(1);
    }

    static boolean isStat(String what) {
        return what != null && what.length() == 4 && "stre inte dext cons wisd".contains(what);
    }

    // The exp for n points of what, the price rising as it goes up (the
    // engine's was traincost a point, whatever you had: 30 to 126 max HP
    // for one beginner's bounty). Each point costs traincost times:
    //   a stat     its (base) value / 10       10 -> 1x, 20 -> 2x
    //   HP or MP   the max / 30                30 -> 1x, 120 -> 4x
    //   a skill    1 + its value / 20          5 -> 1x, 40 -> 3x, 99 -> 5x
    // never less than 1x. Magic schools (Classes.trainSchool) stay flat.
    public static long price(LivingThing who, String what, int n, int traincost) {
        int v, step = 1;
        if ("hp".equals(what) || "mp".equals(what)) {
            v = who.attributes.getStat("max" + what);
            step = Classes.growth(who, what);
        } else if (isStat(what)) {
            v = who.attributes.getStat(what);
        } else {
            v = who.getSkill(what);
        }
        long total = 0;
        for (int k = 0; k < n; k++, v += step) {
            long times = "hp".equals(what) || "mp".equals(what) ? v / 30 : isStat(what) ? v / 10 : 1 + v / 20;
            total += (long) traincost * Math.max(1, times);
        }
        return total;
    }

    // A trainer list's "10exp)train:X" price, for who (Classes.wares).
    public static String priced(LivingThing who, String line, int traincost) {
        try {
            int i = line.indexOf("exp)train:");
            if (i < 0) return line;
            String what = statFor(line.substring(i + 10).trim());
            if (what == null || what.toLowerCase().endsWith("group") || Classes.schoolMax(who, what) != null) return line;
            int start = i;
            while (start > 0 && Character.isDigit(line.charAt(start - 1))) start--;
            return line.substring(0, start) + price(who, what, 1, traincost) + line.substring(i);
        } catch (Exception e) {
            return line;
        }
    }

    // Buying training from a trainer. HP and MP are done here: trainers
    // sell them as "HP" and "MP", which the server didn't know (so they
    // became a skill called HP that did nothing), and its own "hp" raised
    // max HP without taking the exp. Each point is the class's HP or MP
    // per point (Classes.growth). Stats and skills are done here too, at
    // the rising price (price above), not the engine's flat one.
    public static void train(Merchant m, String ware, int n, LivingThing who) {
        String what = statFor(ware);
        if (what == null) return;
        if (n > 100) n = 100;
        if (n < 1) return;
        // Classes: another class's skill costs more or can't be learned
        // (server/Classes.java); stats, HP and MP are for everyone.
        boolean stat = isStat(what);
        if (!"hp".equals(what) && !"mp".equals(what)) {
            long exp = who.exp;
            int had = stat ? who.attributes.getStat(what) : who.getSkill(what);
            if (stat || !Classes.train(m, what, n, who)) {
                if (!stat) n = Math.min(n, 100 - had);
                if (n < 1) {
                    who.chatMessage("You have learnt all there is of " + label(what) + ".\n");
                    return;
                }
                long cost = price(who, what, n, m.engGame.traincost);
                if (who.exp < cost) {
                    who.chatMessage("Sorry, you don't have enough experience points (that costs " + cost + " exp).\n");
                    return;
                }
                if (!who.raiseStats(what, n, (int) cost)) who.learnSkill(what, n, (int) cost);
            }
            // The engine raised a stat or skill without a word (only HP and
            // MP said anything): say how much, when exp was spent.
            int now = stat ? who.attributes.getStat(what) : who.getSkill(what);
            if (who.exp < exp && now > had && !what.toLowerCase().endsWith("group"))
                who.chatMessage("Your " + label(what) + " rises by " + (now - had) + ".\n");
            if (who.exp < exp) newPrices(m, who);
            return;
        }
        long cost = price(who, what, n, m.engGame.traincost);
        if (who.exp < cost) {
            who.chatMessage("Sorry, you don't have enough experience points (that costs " + cost + " exp).\n");
            return;
        }
        int per = Classes.growth(who, what);
        who.attributes.raiseStat("max" + what, n * per);
        who.exp -= cost;
        who.updateInfo();
        who.updateStats();
        who.chatMessage("Your max " + what.toUpperCase() + " rises by " + (n * per) + ".\n");
        newPrices(m, who);
    }

    // The trainer's list again, at the new prices (the engine sends it
    // only on stepping onto the trainer: DuskEngine.refreshEntities).
    static void newPrices(Merchant m, LivingThing who) {
        try {
            m.engGame.refreshEntities(who);
        } catch (Exception e) {
            // The old prices stay shown; the right one is charged.
        }
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
        // Bug reports waiting for gods (server/Mail.java).
        Mail.start(engine);
        // World bosses rising now and then (server/WorldBoss.java).
        WorldBoss.start(engine);
        // Parties (server/Party.java).
        Party.start(engine);
        Duel.start(engine);
        // Achievements (server/Achievements.java).
        Achievements.start(engine);
        // Mining veins and the swing clock (server/Crafting.java).
        Crafting.start(engine);
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
        Thread g = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        Thread.sleep(GODONLY_MS);
                        godOnly(engine);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Skills godonly", false);
                    }
                }
            }
        }, "GodOnly");
        g.setDaemon(true);
        g.start();
    }

    // Places only gods and game masters (privs 2 and up) may be: the file
    // "godonly" in the game directory, a line "x1 y1 x2 y2 name" for each
    // (flan's cabin island: 56 1062 212 1198). Nothing walks or sails
    // there; this catches a player put there any other way (a god's
    // teleport, a bind point) and sends them to their bind point, or
    // Kingshaven's harbour if that's in the same place or not set.
    static final long GODONLY_MS = 2000;
    static final int[] GODONLY_HOME = { 1414, 418 };
    static long godOnlyRead = -1;
    static List<int[]> godOnlyAreas = new ArrayList<int[]>();

    static void godOnly(DuskEngine engine) throws Exception {
        java.io.File f = new java.io.File("godonly");
        long stamp = f.exists() ? f.lastModified() : 0;
        if (stamp != godOnlyRead) {
            List<int[]> areas = new ArrayList<int[]>();
            if (stamp != 0) {
                for (String line : java.nio.file.Files.readAllLines(f.toPath(), java.nio.charset.StandardCharsets.ISO_8859_1)) {
                    String[] w = line.trim().split("\\s+");
                    if (w.length < 4 || !w[0].matches("-?\\d+")) continue;
                    try {
                        areas.add(new int[] { Integer.parseInt(w[0]), Integer.parseInt(w[1]), Integer.parseInt(w[2]), Integer.parseInt(w[3]) });
                    } catch (NumberFormatException e) {
                        // not an area line
                    }
                }
            }
            godOnlyAreas = areas;
            godOnlyRead = stamp;
        }
        if (godOnlyAreas.isEmpty()) return;
        for (Object o : engine.vctSockets.toArray()) {
            LivingThing p = (LivingThing) o;
            if (p.privs >= 2 || !inGodOnly(p.intLocX, p.intLocY)) continue;
            int x = p.bindLocX, y = p.bindLocY;
            if (x < 0 || y < 0 || inGodOnly(x, y)) { x = GODONLY_HOME[0]; y = GODONLY_HOME[1]; }
            p.chatMessage("Only gods and game masters may walk here. You are sent away.");
            Log.logEvent("GodOnly: sent " + p.strName + " from " + p.intLocX + "," + p.intLocY + " to " + x + "," + y);
            p.changeLocBypass(x, y);
        }
    }

    static boolean inGodOnly(int x, int y) {
        for (int[] a : godOnlyAreas) if (x >= a[0] && x <= a[2] && y >= a[1] && y <= a[3]) return true;
        return false;
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
        int str = 0, stamina = 0, hp = 0, mp = 0;
        synchronized (p.skillTable) {
            for (Object k : p.skillTable.keySet().toArray()) {
                String key = String.valueOf(k);
                Skill s = (Skill) p.skillTable.get(k);
                if (s == null) continue;
                if (key.equalsIgnoreCase("strength")) { str += s.value; p.skillTable.remove(k); }
                else if (key.equalsIgnoreCase("stamina")) { stamina += s.value; p.skillTable.remove(k); }
                else if (key.equalsIgnoreCase("hp")) { hp += s.value; p.skillTable.remove(k); }
                else if (key.equalsIgnoreCase("mp")) { mp += s.value; p.skillTable.remove(k); }
            }
        }
        int revived = revive(p);
        if (str == 0 && stamina == 0 && hp == 0 && mp == 0 && revived == 0) return;
        StringBuffer said = new StringBuffer();
        if (str > 0) {
            p.attributes.raiseStat("stre", str);
            said.append("Your Strength training now counts as STR: +").append(str).append(" STR. ");
        }
        if (stamina > 0) {
            long refund = (long) engine.traincost * stamina;
            p.exp += refund;
            said.append("Stamina training did nothing, so its ").append(refund).append(" exp has been given back. ");
        }
        if (revived > 0) said.append(revived == 1 ? "An item wrongly marked used up can be used again. " : revived + " items wrongly marked used up can be used again. ");
        if (hp > 0) {
            p.attributes.raiseStat("maxhp", hp * 10);
            said.append("Your HP training now counts: +").append(hp * 10).append(" max HP. ");
        }
        if (mp > 0) {
            p.attributes.raiseStat("maxmp", mp * 10);
            said.append("Your MP training now counts: +").append(mp * 10).append(" max MP. ");
        }
        try {
            p.savePlayer();
            p.updateStats();
            p.updateInfo();
        } catch (Exception e) {
            // Saved on the next tick or logout.
        }
        p.chatMessage(said.toString().trim());
        Log.logEvent("Skills: converted " + p.strName + "'s old skills (Strength " + str + ", Stamina " + stamina + ", HP " + hp + ", MP " + mp + ", used-up items " + revived + ")");
    }

    // Items left "used up" by the old useItem mix-up (see useFirst): one at
    // 0 uses whose use script removes it should have gone, and a fresh one
    // went instead, so it gets its use back.
    static int revive(LivingThing p) {
        int n = 0;
        synchronized (p.items) {
            for (Object o : p.items.toArray()) {
                Item it = (Item) o;
                if (it == null || it.intUses != 0 || it.strOnUseScript == null) continue;
                if (!removesAlways(useScriptText(it.strOnUseScript))) continue;
                it.intUses = 1;
                n++;
            }
        }
        if (n > 0) p.updateItems();
        return n;
    }

    // A use script that takes its item away before any "if" or early end,
    // so every use removes it (a god tool that checks first is left alone).
    static boolean removesAlways(String script) {
        for (String line : script.split("\n")) {
            String l = line.trim();
            if (l.startsWith("removeitem")) return true;
            if (l.startsWith("if") || l.startsWith("endscript")) return false;
        }
        return false;
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
        int pct = fighting ? 0 : Classes.mpRegen(p);
        if (pct > 0) {
            int mp = p.attributes.getStat("mp");
            int max = p.attributes.getStat("maxmp") + p.attributes.getStat(2, "mpbon");
            int extra = max * pct / 100;
            if (extra > 0 && mp < max) p.attributes.setStat("mp", Math.min(max, mp + extra));
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
        if (r > 0 || m > 0 || pct > 0) {
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
    // Using one of several items with the same name (three ales): the use
    // script's "removeitem trigger ale" takes the first ale, and the engine
    // then counts the use on the one clicked, so a fresh ale went and the
    // clicked one stayed behind "used up". Before the script runs, the
    // clicked one is put in front of its namesakes, so it's the one taken.
    // Only same-named items swap places, so the inventory looks the same.
    // Armour from what's worn (LivingThingPatch makes getArmorMod this): the
    // engine's share of each piece's mod (the body 0.4, the head 0.2, the
    // waist 0.15, arms, legs, hands, eyes and neck 0.05), added up and then
    // rounded down once. The engine rounded after each piece, so a piece
    // worth under 1 (leather sleeves, mod 10) added nothing.
    static final int[] ARMOR_SLOTS = { 1, 2, 8, 7, 5, 6, 3, 4 };
    static final double[] ARMOR_SHARE = { 0.05, 0.05, 0.05, 0.05, 0.05, 0.2, 0.4, 0.15 };

    public static int armorMod(LivingThing who) {
        double sum = 0;
        for (int i = 0; i < ARMOR_SLOTS.length; i++) {
            try {
                Item item = who.equWorn.getItem(ARMOR_SLOTS[i]);
                if (item != null) sum += ARMOR_SHARE[i] * item.intMod;
            } catch (Exception e) {
                // Nothing there.
            }
        }
        return (int) sum;
    }

    public static void useFirst(LivingThing who, Item item) {
        if (who == null || item == null || item.strName == null) return;
        synchronized (who.items) {
            int at = who.items.indexOf(item);
            if (at < 0) return;
            for (int i = 0; i < at; i++) {
                Item o = (Item) who.items.elementAt(i);
                if (o != null && item.strName.equalsIgnoreCase(o.strName)) {
                    who.items.removeElementAt(at);
                    who.items.insertElementAt(item, i);
                    return;
                }
            }
        }
    }

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
        // A battle spell out of battle: refused before the engine charges
        // its MP (and before its wait starts).
        if (name != null && who.batBattle == null && battleOnly(name)) {
            who.chatMessage("You must be in battle to use this spell.\n");
            return;
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

    // ---- spell costs and unlocks (SpellPatch.java and SpellGroup.java call these) ----
    // A spell's MP cost is its "mp <n>" line in defSpells/<spell>, and the
    // group points it needs its "unlock <n>" line (the engine reads only the
    // first line there, the group). Without them, the engine's own sums
    // stand: unlock 100 * place / (spells - 1), cost (110 - (group points -
    // unlock)) / 2. Read again whenever the file changes.
    static final java.util.Map<String, long[]> spellLines = new java.util.concurrent.ConcurrentHashMap<String, long[]>();

    // { file time, mp or -1, unlock or -1 }, or null if there's no such spell.
    static long[] spellLines(Object spell) {
        if (spell == null) return null;
        String name = spell.toString();
        java.io.File f = new java.io.File("defSpells", name);
        long when = f.lastModified();
        if (when == 0) return null;
        long[] known = spellLines.get(name);
        if (known != null && known[0] == when) return known;
        long mp = -1, unlock = -1;
        try {
            for (String line : java.nio.file.Files.readAllLines(f.toPath(), java.nio.charset.StandardCharsets.ISO_8859_1)) {
                String[] w = line.trim().split("\\s+");
                if (w.length != 2 || !w[1].matches("\\d{1,5}")) continue;
                if (w[0].equalsIgnoreCase("mp")) mp = Long.parseLong(w[1]);
                else if (w[0].equalsIgnoreCase("unlock")) unlock = Math.min(100, Long.parseLong(w[1]));
            }
        } catch (Exception e) {
            return null;
        }
        known = new long[] { when, mp, unlock };
        spellLines.put(name, known);
        return known;
    }

    public static int spellCost(int formula, Object spell) {
        long[] l = spellLines(spell);
        return l != null && l[1] >= 0 ? (int) l[1] : formula;
    }

    public static int spellUnlock(int formula, Object spell) {
        long[] l = spellLines(spell);
        return l != null && l[2] >= 0 ? (int) l[2] : formula;
    }

    // A spell whose script asks "isinbattle caster" (the damage spells) is
    // for battle only. Read from its group's script, again if that changes.
    static final java.util.Map<String, long[]> battleSpells = new java.util.concurrent.ConcurrentHashMap<String, long[]>();

    static boolean battleOnly(String spell) {
        try {
            java.io.File def = new java.io.File("defSpells", spell);
            if (!def.exists()) return false;
            String group = java.nio.file.Files.readAllLines(def.toPath(), java.nio.charset.StandardCharsets.ISO_8859_1).get(0).trim();
            java.io.File list = new java.io.File("defSpellGroups", group);
            int i = 0, at = -1;
            for (String l : java.nio.file.Files.readAllLines(list.toPath(), java.nio.charset.StandardCharsets.ISO_8859_1)) {
                if (l.trim().isEmpty()) continue;
                if (l.trim().equalsIgnoreCase(spell)) { at = i; break; }
                i++;
            }
            if (at < 0) return false;
            java.io.File script = new java.io.File("defSpellGroups", at + " " + group);
            long when = script.lastModified() ^ list.lastModified();
            long[] known = battleSpells.get(spell);
            if (known != null && known[0] == when) return known[1] == 1;
            String text = new String(java.nio.file.Files.readAllBytes(script.toPath()), "ISO-8859-1").toLowerCase();
            boolean only = text.contains("isinbattle caster");
            battleSpells.put(spell, new long[] { when, only ? 1 : 0 });
            return only;
        } catch (Exception e) {
            return false;
        }
    }

    // "<who> skill <name>" in a script: a skill, or else the spell group of
    // that name (so a heal can read caster skill "clerical group").
    public static byte scriptSkill(LivingThing who, String name) {
        byte v = who.getSkill(name);
        if (v != 0 || name == null) return v;
        return (byte) Classes.spellPoints(who, name);
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
