/*
 * Classes: Fighter, Mage, Cleric, Priest/Priestess (dark elves), Ranger and
 * Paladin. Kept as a hidden flag "class_<id>" (like the sex flags), so
 * scripts and talk can ask hasCondition trigger class_mage.
 *
 * Everything else is in the file "classes" (written with the defaults
 * below if it's missing; changes take effect at once):
 *   - which races may pick each class,
 *   - each class's core skills and spell groups (normal price), the open
 *     ones (normal price for everyone), and barred ones (not at all);
 *     anything core for another class costs "multiplier" times as much and
 *     stops at "crosscap" points; anything not listed counts as open,
 *   - what a class starts with (stats, max HP/MP, skills, items),
 *   - HP and MP per point bought at a trainer,
 *   - how fast MP comes back (a share of max MP, see Skills.regen),
 *   - what gear each class may wear, by the words in an item's name,
 *   - spell schools ("school", "tier5", "refuse"): open or closed to each
 *     class, behind guild and lore flags; no cross-class price for them.
 *     A closed school is refused at trainers and left out of their lists
 *     (wares(), called from the engine: SpellPatch.java "engine"),
 *   - classes nobody can choose any more ("hidden"), kept for those who are.
 *
 * A character without a class can't move, fight, train, buy or cast until
 * they choose (gods excepted). Choosing, once: the class's start goes on,
 * and skills and spell groups that are another class's (cross-class or
 * barred) are taken away, their exp given back.
 *
 *   class                       "Class: <id>|<name>" | "Class: unset" (with how to choose)
 *   class choices               "ClassChoices: id|name|blurb;..." (this race's)
 *   class tiers                 "ClassTiers: name=tier;..." (core|open|cross|barred)
 *   class <id or name>          choose, once
 *   setclass <player> <id>      gods: change a player's class (flag only)
 *   guilds                      your guilds and ranks ("guild <group>: name | 5 ranks")
 *   guildflag <player> <flag> on|off   gods: set or clear a guild flag (FLAGS)
 *   guildflags <player>         gods: a player's guild flags and ranks
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Classes {
    static final int GOD_PRIVS = 3;

    static final String DEFAULTS = String.join("\n",
        "# Classes (server/Classes.java). Changes take effect at once.",
        "# Names of skills and spell groups are as trainers sell them (any case).",
        "",
        "# Another class's core skill costs this many times the price, up to this many points.",
        "multiplier 2",
        "crosscap 50",
        "",
        "# class <id> <name>   (a second name after | is used for female characters)",
        "class fighter Fighter",
        "class mage Mage",
        "class cleric Cleric",
        "class priest Priest|Priestess",
        "class ranger Ranger",
        "class paladin Paladin",
        "",
        "# blurb <id> <text>: shown when choosing",
        "blurb fighter Master of weapons and fighting skills.",
        "blurb mage Student of the arcane, who calls on dark magic and summoned beasts.",
        "blurb cleric Servant of the Light, who heals the wounded and blesses allies.",
        "blurb priest Servant of the Spider Queen, who heals her faithful and blesses her chosen.",
        "blurb ranger Wanderer of the wilds, quick with blade and bow, wise in nature's magic.",
        "blurb paladin Holy warrior, who fights with steel and faith alike.",
        "",
        "# races <id> <race>, ... : who may choose it (-race: everyone but). No line: everyone.",
        "races cleric -darkelf",
        "races priest darkelf",
        "",
        "# core <id> <names>: normal price. open <names>: normal price for everyone.",
        "# barred <id> <names>: this class can't train them at all.",
        "core fighter Dodge, Double Attack, Triple Attack, Quadruple Attack",
        "core mage Spell Power",
        "core cleric Spell Power",
        "core priest Spell Power",
        "core ranger Dodge, Double Attack, Triple Attack, Lock Picking",
        "core paladin Dodge, Double Attack, Spell Power",
        "barred mage Dodge, Double Attack, Triple Attack, Quadruple Attack",
        "open Regeneration, Mana Regen, Armor Identification, Mana Tap, Life Tap",
        "open Mining, Herbalism, Woodcutting, Smithing, Alchemy, Fletching",
        "",
        "# start <id> <what> <n>, ... : on choosing. Stats stre inte dext cons wisd, maxhp, maxmp;",
        "# a skill or spell group and its points; item <name>. The items and skills",
        "# (not groups) are the starter kit, which the choice names.",
        "start fighter stre 3, cons 1, maxhp 10, maxmp 8, Dodge 5, item short sword, Double Attack 10",
        "start mage inte 3, wisd 1, maxhp -5, maxmp 30, arcane group 1, item quarter staff",
        "start cleric wisd 3, inte 1, maxhp 2, maxmp 26, divine group 1, item quarter staff",
        "start priest wisd 3, inte 1, maxhp 2, maxmp 26, drow group 1, item quarter staff",
        "start ranger dext 3, stre 1, maxhp 5, maxmp 16, item hunting bow, Double Attack 10",
        "start paladin stre 2, wisd 2, maxhp 7, maxmp 20, divine group 1, item short sword, Dodge 5",
        "",
        "# growth <id> <max HP per point> <max MP per point>, bought at a trainer (else 10 and 10)",
        "growth fighter 12 8",
        "growth mage 8 12",
        "growth cleric 10 11",
        "growth priest 10 11",
        "growth ranger 11 9",
        "growth paladin 11 10",
        "",
        "# mpregen <id> <percent>: out of battle, every 18 s, this much of max MP comes back on top",
        "# of the server's own 1 + WIS/2 (else 4)",
        "mpregen fighter 4",
        "mpregen mage 4",
        "mpregen cleric 4",
        "mpregen priest 4",
        "mpregen ranger 4",
        "mpregen paladin 4",
        "",
        "# Gear. kind <kind> <words>: a weapon, bow or armour whose name has one of the words",
        "# (the first kind that matches, in this order). Otherwise a weapon is a blade, a ranged",
        "# weapon a bow, armour heavy.",
        "kind tool mining pick, pick, pickaxe, shovel, sickle, lumberjack, woodcutter, smithing hammer, fletching knife",
        "kind staff staff, rod, wand",
        "kind dagger dagger, knife, spike",
        "kind blade sword, blade, saber, cutlas, masamune, excalibur, reaver",
        "kind bow bow",
        "kind spear spear",
        "kind axe axe",
        "kind blunt hammer, fist, club, mace, claw, stone",
        "kind magic fire, lightning, flare, twinkle, summon demon",
        "kind any amulet, necklace, pendant, collar, lens, glasses, goggles, gasmask, booster, belt, eye of the dead, skull, force field",
        "kind light cloth, leather, robe, cloak, toga, garb, cape, sash, tunic, vest, jerkin, pelt, hide, skin, silk, sandals, flippers, boots, newbie, wizards",
        "# item <kind> <item name>: one item, whatever its name says",
        "",
        "# wears <id> <kinds>: what the class may wear and wield. No line: anything.",
        "# (Kinds: tool staff dagger blade bow spear axe blunt magic, any light heavy.)",
        "wears mage tool, staff, dagger, magic, any, light",
        "wears cleric tool, staff, blunt, magic, any, light, heavy",
        "wears priest tool, staff, blunt, magic, any, light, heavy",
        "wears ranger tool, staff, dagger, blade, bow, spear, axe, blunt, magic, any, light",
        "",
        "# school <group>: <class>[:<most points>][+<flag>][+<group> >= <points>], ...",
        "# Who may learn a spell school; anyone it doesn't name can't, and trainers don't show",
        "# it to them. \"all\" is every class. Flags are hidden conditions (guild_mage, ...).",
        "school arcane group: fighter+guild_mage, ranger+guild_mage, mage+guild_mage",
        "school forbidden group: fighter+guild_mage+forbidden_lore+archmage_quest+arcane group>=75, ranger+guild_mage+forbidden_lore+archmage_quest+arcane group>=75, mage+guild_mage+forbidden_lore+archmage_quest+arcane group>=75",
        "school divine group: cleric, paladin:49",
        "school drow group: priest",
        "school nature group: ranger+guild_circle",
        "school open group: all",
        "# tier5 <group>: <flag>: points past 74 need that flag too (the tier 5 quest).",
        "tier5 arcane group: archmage_quest",
        "tier5 nature group: archdruid_quest",
        "# refuse <group>: <text>: what a trainer says to someone the school is closed to.",
        "refuse arcane group: The Mage Guild teaches its arts only to its own members.",
        "refuse forbidden group: That is not taught here.",
        "refuse divine group: The Temple teaches its prayers only to Clerics and Paladins.",
        "refuse drow group: Only the priesthood of the Spider Queen learns these rites.",
        "refuse nature group: Only those The Circle has taken in may learn its ways.",
        "# hidden <class>: nobody can choose it any more; those who have it keep it.",
        "hidden mage",
        "");

    static class Def {
        String id, name, femaleName, blurb = "";
        List<String> races = new ArrayList<String>(), notRaces = new ArrayList<String>();
        List<String> core = new ArrayList<String>(), barred = new ArrayList<String>(), wears = null;
        List<String[]> start = new ArrayList<String[]>();
        int hpPer = 10, mpPer = 10, mpRegen = 4;
        boolean hidden;
    }

    // One "who" of a school line: a class (or "all"), the flags it needs,
    // the points it needs in other schools, and the most points it may have.
    static class Entry {
        String cls;
        int max = 100;
        List<String> flags = new ArrayList<String>();
        List<Object[]> needs = new ArrayList<Object[]>(); // { group, points }
    }

    static Map<String, List<Entry>> schools = new LinkedHashMap<String, List<Entry>>();
    static Map<String, String> tier5 = new LinkedHashMap<String, String>(), refuse = new LinkedHashMap<String, String>();
    // school -> { guild name, rank 1 .. rank 5 } ("guild <group>: ..." lines)
    static Map<String, String[]> guilds = new LinkedHashMap<String, String[]>();
    // The flags gods may set with guildflag (each a hidden condition).
    static final String[] FLAGS = { "guild_mage", "guild_circle", "forbidden_lore", "archmage_quest", "archdruid_quest", "guild_tester" };
    // Group points where each tier starts.
    static final int[] TIERS = { 0, 10, 25, 50, 75 };

    static Map<String, Def> defs = new LinkedHashMap<String, Def>();
    static List<String> open = new ArrayList<String>();
    static List<String[]> kinds = new ArrayList<String[]>(); // { kind, word }
    static Map<String, String> itemKinds = new LinkedHashMap<String, String>();
    static int multiplier = 2, crosscap = 50;
    static long read = -1;

    static List<String> list(String s) {
        List<String> out = new ArrayList<String>();
        for (String p : s.split(",")) if (p.trim().length() > 0) out.add(p.trim().toLowerCase());
        return out;
    }

    static synchronized void load() {
        File f = new File("classes");
        try {
            if (!f.exists()) Talk.write(f, DEFAULTS.getBytes("UTF-8"));
        } catch (Exception e) {
            Log.logError(e, "Classes: writing the classes file", false);
        }
        long m = f.exists() ? f.lastModified() : 0;
        if (m == read) return;
        Map<String, Def> d = new LinkedHashMap<String, Def>();
        List<String> o = new ArrayList<String>();
        List<String[]> k = new ArrayList<String[]>();
        Map<String, String> ik = new LinkedHashMap<String, String>();
        int mult = 2, cap = 50;
        Map<String, List<Entry>> sch = new LinkedHashMap<String, List<Entry>>();
        Map<String, String> t5 = new LinkedHashMap<String, String>(), ref = new LinkedHashMap<String, String>();
        Map<String, String[]> gl = new LinkedHashMap<String, String[]>();
        try {
            List<String> lines = m > 0 ? Files.readAllLines(f.toPath()) : java.util.Arrays.asList(DEFAULTS.split("\n"));
            for (String line : lines) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                String[] w = line.split("\\s+", 3);
                String key = w[0].toLowerCase();
                try {
                    if ((key.equals("school") || key.equals("tier5") || key.equals("refuse") || key.equals("guild")) && line.indexOf(':') > 0) {
                        // "<key> <group>: <rest>" (a group's name has spaces)
                        String group = line.substring(key.length(), line.indexOf(':')).trim().toLowerCase();
                        String rest = line.substring(line.indexOf(':') + 1).trim();
                        if (key.equals("tier5")) t5.put(group, rest.toLowerCase());
                        else if (key.equals("refuse")) ref.put(group, rest);
                        else if (key.equals("guild")) {
                            String[] g = rest.split("\\|");
                            if (g.length == 6) { for (int i = 0; i < 6; i++) g[i] = g[i].trim(); gl.put(group, g); }
                        }
                        else sch.put(group, entries(rest));
                    } else if (key.equals("multiplier")) mult = Math.max(1, Integer.parseInt(w[1]));
                    else if (key.equals("crosscap")) cap = Math.max(0, Math.min(100, Integer.parseInt(w[1])));
                    else if (key.equals("open")) o.addAll(list(line.substring(4)));
                    else if (key.equals("kind")) { for (String word : list(w[2])) k.add(new String[] { w[1].toLowerCase(), word }); }
                    else if (key.equals("item")) ik.put(w[2].trim().toLowerCase(), w[1].toLowerCase());
                    else if (key.equals("class")) {
                        Def c = new Def();
                        c.id = w[1].toLowerCase();
                        String[] names = w[2].split("\\|");
                        c.name = names[0].trim();
                        c.femaleName = names.length > 1 ? names[1].trim() : c.name;
                        d.put(c.id, c);
                    } else {
                        Def c = d.get(w[1].toLowerCase());
                        if (c == null) continue;
                        String rest = w.length > 2 ? w[2] : "";
                        if (key.equals("blurb")) c.blurb = rest.trim();
                        else if (key.equals("races")) for (String r : list(rest)) { if (r.startsWith("-")) c.notRaces.add(r.substring(1).trim()); else c.races.add(r); }
                        else if (key.equals("core")) c.core.addAll(list(rest));
                        else if (key.equals("barred")) c.barred.addAll(list(rest));
                        else if (key.equals("wears")) { if (c.wears == null) c.wears = new ArrayList<String>(); c.wears.addAll(list(rest)); }
                        else if (key.equals("growth")) { String[] g = rest.trim().split("\\s+"); c.hpPer = Integer.parseInt(g[0]); c.mpPer = Integer.parseInt(g[1]); }
                        else if (key.equals("mpregen")) c.mpRegen = Integer.parseInt(rest.trim());
                        else if (key.equals("hidden")) c.hidden = true;
                        else if (key.equals("start")) {
                            for (String part : rest.split(",")) {
                                String p = part.trim();
                                if (p.toLowerCase().startsWith("item ")) { c.start.add(new String[] { "item", p.substring(5).trim() }); continue; }
                                int sp = p.lastIndexOf(' ');
                                if (sp > 0) c.start.add(new String[] { p.substring(0, sp).trim(), p.substring(sp + 1).trim() });
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.logError(e, "Classes: bad line in classes: " + line, false);
                }
            }
        } catch (Exception e) {
            Log.logError(e, "Classes: reading classes", false);
        }
        defs = d;
        open = o;
        schools = sch;
        tier5 = t5;
        refuse = ref;
        guilds = gl;
        for (String fl : FLAGS) hiddenFlag(fl);
        for (List<Entry> es : sch.values()) for (Entry e : es) for (String fl : e.flags) hiddenFlag(fl);
        for (String fl : t5.values()) hiddenFlag(fl);
        kinds = k;
        itemKinds = ik;
        multiplier = mult;
        crosscap = cap;
        read = m;
    }

    // ---- who is what ----------------------------------------------------------

    static Def of(LivingThing who) {
        load();
        for (Def c : defs.values()) if (who.hasCondition("class_" + c.id)) return c;
        return null;
    }

    static String nameFor(Def c, LivingThing who) {
        return "female".equals(Sex.of(who)) ? c.femaleName : c.name;
    }

    // The class's name for a profile or the who list ("" when none).
    public static String name(LivingThing who) {
        Def c = of(who);
        return c == null ? "" : nameFor(c, who);
    }

    // A class id's name, from a saved file (Admin's profiles); "" when none.
    public static String displayName(String id, boolean female) {
        if (id == null || id.length() == 0) return "";
        load();
        Def c = defs.get(id.toLowerCase());
        return c == null ? "" : female ? c.femaleName : c.name;
    }

    static boolean allowed(Def c, LivingThing who) {
        String race = who.strRace == null ? "" : who.strRace.trim().toLowerCase();
        if (c.notRaces.contains(race)) return false;
        return c.races.isEmpty() || c.races.contains(race);
    }

    static boolean exempt(LivingThing who) {
        return !(who instanceof Player) || who.privs >= GOD_PRIVS;
    }

    // "core", "open", "cross" or "barred", for something a trainer sells.
    static String tier(Def c, String skill) {
        String s = skill.trim().toLowerCase();
        if (c.barred.contains(s)) return "barred";
        if (c.core.contains(s)) return "core";
        if (open.contains(s)) return "open";
        for (Def other : defs.values()) if (other.core.contains(s)) return "cross";
        return "open";
    }

    // ---- spell schools ----------------------------------------------------------

    // "fighter+guild_mage, paladin:49, mage+guild_mage+arcane group>=75, all"
    static List<Entry> entries(String rest) {
        List<Entry> out = new ArrayList<Entry>();
        for (String part : rest.split(",")) {
            String p = part.trim().toLowerCase();
            if (p.isEmpty()) continue;
            Entry e = new Entry();
            String[] bits = p.split("\\+");
            String head = bits[0].trim();
            int colon = head.indexOf(':');
            if (colon > 0) {
                e.max = Math.max(0, Math.min(100, Integer.parseInt(head.substring(colon + 1).trim())));
                head = head.substring(0, colon).trim();
            }
            e.cls = head;
            for (int i = 1; i < bits.length; i++) {
                String b = bits[i].trim();
                int ge = b.indexOf(">=");
                if (ge > 0) e.needs.add(new Object[] { b.substring(0, ge).trim(), Integer.parseInt(b.substring(ge + 2).trim()) });
                else if (b.length() > 0) e.flags.add(b);
            }
            out.add(e);
        }
        return out;
    }

    // The most points who may have in a school: -1 when it's closed to them,
    // null when it's no school (then the core/cross/barred lists count).
    public static Integer schoolMax(LivingThing who, String group) {
        load();
        if (group == null) return null;
        String g = group.trim().toLowerCase();
        List<Entry> rules = schools.get(g);
        if (rules == null) return null;
        if (exempt(who)) return 100;
        Def c = of(who);
        int best = -1;
        for (Entry e : rules) {
            if (!e.cls.equals("all") && (c == null || !e.cls.equals(c.id))) continue;
            boolean ok = true;
            for (String f : e.flags) if (!who.hasCondition(f)) ok = false;
            for (Object[] n : e.needs) if (spellPoints(who, (String) n[0]) < (Integer) n[1]) ok = false;
            if (ok) best = Math.max(best, e.max);
        }
        String flag = tier5.get(g);
        if (best > 74 && flag != null && !who.hasCondition(flag)) best = 74;
        return best;
    }

    // Who's rank in a school's guild: "<guild>|<rank>|<tier>|<points>", or
    // null when the school is closed to them. A member is anyone the school
    // is open to; the rank is the highest tier their points reach (tier 5
    // also needs the school's tier5 flag, if it has one).
    public static String rank(LivingThing who, String group) {
        load();
        String g = group.trim().toLowerCase();
        String[] guild = guilds.get(g);
        Integer max = schoolMax(who, g);
        if (guild == null || max == null || max < 0) return null;
        int points = spellPoints(who, g), tier = 1;
        for (int t = 1; t < TIERS.length; t++) if (points >= TIERS[t]) tier = t + 1;
        String flag = tier5.get(g);
        if (tier == 5 && flag != null && !who.hasCondition(flag) && !exempt(who)) tier = 4;
        return guild[0] + "|" + guild[tier] + "|" + tier + "|" + points;
    }

    static String ranks(LivingThing who) {
        StringBuilder b = new StringBuilder();
        for (String g : guilds.keySet()) {
            String r = rank(who, g);
            if (r == null) continue;
            String[] p = r.split("\\|");
            if (b.length() > 0) b.append("; ");
            b.append(p[0]).append(": ").append(p[1]).append(" (tier ").append(p[2]).append(", ").append(g).append(" ").append(p[3]).append(")");
        }
        return b.length() > 0 ? b.toString() : "none";
    }

    static String refusal(String group) {
        String r = refuse.get(group.trim().toLowerCase());
        return r != null ? r : "That isn't taught to you.";
    }

    // Training a school: refused when closed, up to the class's most, at the
    // normal price.
    static boolean trainSchool(Merchant m, String what, int n, LivingThing who, int max) {
        String g = what.trim().toLowerCase();
        if (max < 0) {
            who.chatMessage(refusal(g) + "\n");
            return true;
        }
        int have = spellPoints(who, what);
        if (n > 100) n = 100;
        if (have >= max) {
            if (max == 74 && tier5.containsKey(g)) who.chatMessage("To go further in " + g.replaceAll("\\s*group$", "") + " magic you must first prove yourself (the tier 5 quest).\n");
            else who.chatMessage("You have learnt all of " + g.replaceAll("\\s*group$", "") + " magic that is taught to a " + nameFor(of(who), who) + ".\n");
            return true;
        }
        if (n > max - have) n = max - have;
        long cost = (long) m.engGame.traincost * n;
        if (who.exp < cost) {
            who.chatMessage("Sorry, you don't have enough experience points\n");
            return true;
        }
        who.learnSkill(what, n, (int) cost);
        return true;
    }

    // A trainer's list as the engine sends it ("10exp)train:divine group"
    // lines, from DuskEngine.refreshEntities): schools closed to who are
    // left out, so nobody sees what they can't learn.
    public static String wares(LivingThing who, String list) {
        try {
            if (list == null || list.indexOf("train:") < 0) return list;
            int traincost = who.engGame.traincost;
            // The opcode (\u0011) shares a line with the first ware: keep it.
            String op = list.length() > 0 && list.charAt(0) < ' ' ? list.substring(0, 1) : "";
            List<String> kept = new ArrayList<String>();
            for (String line : list.substring(op.length()).split("\n", -1)) {
                int i = line.indexOf("train:");
                if (i >= 0 && !exempt(who)) {
                    Integer max = schoolMax(who, line.substring(i + 6));
                    if (max != null && max < 0) continue;
                }
                // The price for who, rising with what they have (Skills.price).
                kept.add(i >= 0 ? Skills.priced(who, line, traincost) : line);
            }
            return op + String.join("\n", kept);
        } catch (Exception e) {
            Log.logError(e, "Classes.wares", false);
            return list;
        }
    }

    // ---- training (from Skills.train) -----------------------------------------

    // True when it's been dealt with here (refused, or trained at the
    // cross-class price); false: train as usual.
    public static boolean train(Merchant m, String what, int n, LivingThing who) {
        if (exempt(who)) return false;
        Def c = of(who);
        if (c == null) {
            who.chatMessage("Choose your class first: type class.\n");
            return true;
        }
        Integer school = schoolMax(who, what);
        if (school != null) return trainSchool(m, what, n, who, school);
        String t = tier(c, what);
        if (t.equals("barred")) {
            who.chatMessage("A " + nameFor(c, who) + " can't learn " + what + ".\n");
            return true;
        }
        if (!t.equals("cross")) return false;
        if (n > 100) n = 100;
        int have = Math.max(skillPoints(who, what), spellPoints(who, what));
        int room = crosscap - have;
        if (room <= 0) {
            who.chatMessage("A " + nameFor(c, who) + " can learn " + what + " only up to " + crosscap + ". (It's another class's skill.)\n");
            return true;
        }
        if (n > room) n = room;
        if (n < 1) return true;
        long cost = Skills.price(who, what, n, m.engGame.traincost) * multiplier;
        if (who.exp < cost) {
            who.chatMessage("Sorry, you don't have enough experience points. (" + what + " is another class's skill: " + multiplier + " times the price, " + cost + " exp.)\n");
            return true;
        }
        who.learnSkill(what, n, (int) cost);
        who.chatMessage("You train " + n + " in " + what + " for " + cost + " exp (another class's skill: " + multiplier + " times the price, up to " + crosscap + ").\n");
        return true;
    }

    // HP or MP per point bought.
    public static int growth(LivingThing who, String what) {
        Def c = exempt(who) ? null : of(who);
        if (c == null) return 10;
        return "mp".equals(what) ? c.mpPer : c.hpPer;
    }

    // Percent of max MP that comes back each regen tick (0 for gods and the
    // classless, who keep only the server's own regen).
    public static int mpRegen(LivingThing who) {
        Def c = exempt(who) ? null : of(who);
        return c == null ? 0 : Math.max(0, c.mpRegen);
    }

    static int skillPoints(LivingThing who, String name) {
        return who.getSkill(name);
    }

    static int spellPoints(LivingThing who, String name) {
        Enumeration e = who.spellTable.keys();
        while (e.hasMoreElements()) {
            Object k = e.nextElement();
            if (String.valueOf(k).equalsIgnoreCase(name.trim())) return ((Spell) who.spellTable.get(k)).value;
        }
        return 0;
    }

    // ---- no class yet ---------------------------------------------------------

    static final String[] ACTIONS = { "n", "s", "e", "w", "north", "south", "east", "west", "a", "attack", "buy", "train", "cast", "get", "take", "wear", "mine", "gather", "chop", "smith", "brew", "fletch", "smelt", "make", "follow" };

    // Before any other command: without a class, actions are refused; and
    // wearing gear the class can't. Null: carry on.
    public static String gate(LivingThing who, DuskEngine engine, String line) {
        if (line == null || exempt(who)) return null;
        String lower = line.trim().toLowerCase();
        String verb = lower.split("\\s+", 2)[0];
        if (of(who) == null) {
            for (String a : ACTIONS) if (verb.equals(a)) return "Choose your class first: type class to see the choices.";
            return null;
        }
        if (verb.equals("wear") && lower.length() > 5) return wear(who, lower.substring(5).trim());
        if (verb.equals("buy")) return buy(who, engine, line.trim());
        return null;
    }

    // ---- what stronger gear needs (the 2026-10-21 item rebalance) ----------
    // The game file gearneeds: "<item name>|<STR, DEX or INT>|<points>" per
    // line, # for comments, read again when it changes. Wearing an item you
    // don't meet is refused; buying one warns first, like the class check.
    // The stat counts with race bonuses, as the engine's damage roll does.
    static final File NEEDS = new File("gearneeds");
    static long needsRead = -1;
    static Map<String, String[]> needs = new Hashtable<String, String[]>();

    static synchronized Map<String, String[]> needs() {
        long at = NEEDS.lastModified();
        if (at != needsRead) {
            Map<String, String[]> m = new Hashtable<String, String[]>();
            try {
                if (NEEDS.exists()) for (String l : Files.readAllLines(NEEDS.toPath(), java.nio.charset.StandardCharsets.ISO_8859_1)) {
                    l = l.trim();
                    if (l.isEmpty() || l.startsWith("#")) continue;
                    String[] f = l.split("\\|");
                    if (f.length == 3) m.put(f[0].trim().toLowerCase(), new String[] { f[1].trim().toUpperCase(), f[2].trim() });
                }
            } catch (Exception e) {
                Log.logError(e, "Classes: reading gearneeds", false);
            }
            needs = m;
            needsRead = at;
        }
        return needs;
    }

    static final String[][] NEED_STATS = { { "STR", "stre", "Strength" }, { "DEX", "dext", "Dexterity" }, { "INT", "inte", "Intelligence" } };

    // Null when who can use item; else what they lack, as a sentence.
    static String lacks(LivingThing who, Item item, String verb) {
        if (item == null || item.strName == null || exempt(who)) return null;
        String[] n = needs().get(item.strName.toLowerCase().replace('_', ' '));
        if (n == null) return null;
        for (String[] st : NEED_STATS) {
            if (!st[0].equals(n[0])) continue;
            int want, have = who.attributes.getStat(st[1]) + who.attributes.getStat(2, st[1] + "bon");
            try { want = Integer.parseInt(n[1]); } catch (Exception e) { return null; }
            if (have >= want) return null;
            return "You need " + want + " " + st[2] + " to " + verb + " the " + item.strName + "; you have " + have + ".";
        }
        return null;
    }

    // Buying gear the class can't use: warned first, and the same buy again
    // within two minutes goes through (the shop sells it all the same).
    static final long WARNED_FOR = 2 * 60 * 1000L;
    static final Hashtable<String, Long> warned = new Hashtable<String, Long>();

    static String buy(LivingThing who, DuskEngine engine, String line) {
        try {
            Def c = of(who);
            // "buy <qty> <name>", as the engine reads it.
            String rest = line.substring(3).trim();
            int sp = rest.indexOf(' ');
            if (sp < 0) return null;
            String name = rest.substring(sp + 1);
            if (name.startsWith("train:") || name.startsWith("pet") || name.indexOf(':') >= 0) return null;
            Merchant shop = engine.overMerchant(who.intLocX, who.intLocY);
            if (shop == null || !shop.contains(name)) return null;
            Item item = engine.getItem(name);
            if (item == null || (item.intType != 1 && item.intType != 2 && item.intType != 5)) return null;
            String why = lacks(who, item, "use");
            String kind = kindOf(item);
            if (why == null && c != null && c.wears != null && !c.wears.contains(kind))
                why = "A " + nameFor(c, who) + " can't use " + kindWords(kind) + ", so you couldn't wear the " + item.strName + ".";
            if (why == null) return null;
            String key = who.strName.toLowerCase() + "|" + name.toLowerCase();
            Long at = warned.remove(key);
            long now = System.currentTimeMillis();
            if (at != null && now - at < WARNED_FOR) return null;
            warned.put(key, now);
            return "Careful: " + why + " Buy it again to buy it anyway.";
        } catch (Exception e) {
            return null; // the engine's own buy
        }
    }

    static String kindWords(String kind) {
        return kind.equals("heavy") ? "heavy armour" : kind.equals("light") ? "light armour" : kind.equals("blade") ? "bladed weapons" : kind + "s";
    }

    // A weapon, bow or armour's kind, from its name.
    static String kindOf(Item item) {
        String name = item.strName == null ? "" : item.strName.toLowerCase().replace('_', ' ');
        String fixed = itemKinds.get(name);
        if (fixed != null) return fixed;
        boolean armor = item.intType == 2;
        for (String[] k : kinds) {
            boolean armorKind = k[0].equals("any") || k[0].equals("light") || k[0].equals("heavy");
            if (armorKind != armor) continue;
            if (name.contains(k[1])) return k[0];
        }
        return armor ? "heavy" : item.intType == 5 ? "bow" : "blade";
    }

    static String wear(LivingThing who, String what) {
        Def c = of(who);
        Item item;
        try {
            // By number (the browser's buttons) or by name (typed).
            item = what.matches("\\d+") ? who.items.getItem(Integer.valueOf(what)) : who.items.getItem(what, 0);
        } catch (Exception e) {
            return null; // the engine's own answer
        }
        if (item == null || (item.intType != 1 && item.intType != 2 && item.intType != 5)) return null;
        String why = lacks(who, item, item.intType == 2 ? "wear" : "wield");
        if (why != null) return why;
        if (c == null || c.wears == null) return null;
        String kind = kindOf(item);
        if (c.wears.contains(kind)) return null;
        return "A " + nameFor(c, who) + " can't use " + kindWords(kind) + " (the " + item.strName + ").";
    }

    // ---- at login (from Sex.afterRace) ----------------------------------------

    public static void atLogin(Player p) {
        try {
            // Mages from before the schools: members of the Mage Guild, their
            // spells kept (the rank follows their arcane points).
            Def was = exempt(p) ? null : of(p);
            if (was != null && was.id.equals("mage") && !p.hasCondition("guild_mage")) {
                hiddenFlag("guild_mage");
                Condition cond = p.engGame.getCondition("guild_mage");
                if (cond != null) {
                    p.addCondition(cond);
                    Log.logEvent("Classes: " + p.strName + " (a Mage) joins the Mage Guild");
                }
            }
            if (!exempt(p) && was != null && !p.hasCondition(KIT_FLAG)) {
                String kit = giveKit(p, p.engGame, was);
                if (!kit.isEmpty()) {
                    p.updateStats();
                    p.savePlayer();
                    p.chatMessage("Every " + nameFor(was, p) + " now starts with a kit. " + kit + "\n");
                    Log.logEvent("Classes: " + p.strName + " got the " + was.id + " starter kit");
                }
            }
            if (exempt(p) || of(p) != null) return;
            // The browser client opens its picker instead.
            if (BridgedSocket.browser(p.sckConnection)) return;
            p.chatMessage("Before you set out, choose your class: " + choices(p) + ". Type class <name> (for example: class fighter). You choose once.\n");
        } catch (Exception e) {
            Log.logError(e, "Classes.atLogin for " + p.strName, false);
        }
    }

    static String choices(LivingThing who) {
        StringBuilder b = new StringBuilder();
        for (Def c : defs.values()) {
            if (!allowed(c, who) || c.hidden) continue;
            if (b.length() > 0) b.append(", ");
            b.append(nameFor(c, who));
        }
        return b.toString();
    }

    // ---- the commands ---------------------------------------------------------

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        String lower = t.toLowerCase();
        if (lower.startsWith("setclass ")) {
            if (who.privs < GOD_PRIVS) return "Only gods can change that.";
            load();
            String[] a = t.substring(9).trim().split("\\s+");
            if (a.length != 2) return "Usage: setclass <name> <class>";
            Player p = Bans.online(engine, a[0]);
            if (p == null) return a[0] + " isn't online.";
            Def c = find(a[1], p);
            if (c == null) return "No class " + a[1] + ". Classes: " + String.join(", ", defs.keySet()) + ".";
            setFlag(p, engine, c);
            p.savePlayer();
            p.chatMessage("A god has made you a " + nameFor(c, p) + ".\n");
            Log.logEvent(who.strName + " made " + p.strName + " a " + c.id);
            return p.strName + " is now a " + nameFor(c, p) + ". (Their skills are as they were.)";
        }
        // ("guild" is taken: the game has an empty commands/guild script.)
        if (lower.equals("guilds")) {
            if (!(who instanceof Player)) return null;
            return "Guilds: " + ranks(who);
        }
        if (lower.startsWith("guildflags ") || lower.startsWith("guildflag ")) {
            if (who.privs < GOD_PRIVS) return "Only gods can do that.";
            load();
            String[] a = t.split("\\s+");
            Player p = a.length > 1 ? Bans.online(engine, a[1]) : null;
            if (p == null) return a.length > 1 ? a[1] + " isn't online." : "Usage: guildflag <name> <flag> on|off, or guildflags <name>";
            if (a[0].equalsIgnoreCase("guildflag")) {
                if (a.length != 4 || !(a[3].equalsIgnoreCase("on") || a[3].equalsIgnoreCase("off"))) return "Usage: guildflag <name> <flag> on|off (flags: " + String.join(", ", FLAGS) + ")";
                String flag = a[2].toLowerCase();
                if (!java.util.Arrays.asList(FLAGS).contains(flag)) return "No guild flag " + flag + ". Flags: " + String.join(", ", FLAGS) + ".";
                hiddenFlag(flag);
                if (a[3].equalsIgnoreCase("on")) {
                    Condition cond = engine.getCondition(flag);
                    if (cond != null && !p.hasCondition(flag)) p.addCondition(cond);
                } else {
                    p.removeCondition(flag);
                }
                p.savePlayer();
                Log.logEvent(who.strName + " set " + flag + " " + a[3].toLowerCase() + " for " + p.strName);
            }
            StringBuilder f = new StringBuilder();
            for (String fl : FLAGS) if (p.hasCondition(fl)) f.append(f.length() > 0 ? ", " : "").append(fl);
            return p.strName + ": flags " + (f.length() > 0 ? f : "none") + "; guilds " + ranks(p) + ".";
        }
        if (!(lower.equals("class") || lower.startsWith("class "))) return null;
        if (!(who instanceof Player)) return null;
        load();
        Def now = of(who);
        String arg = lower.substring(5).trim();
        if (arg.length() == 0) {
            if (now != null) return "Class: " + now.id + "|" + nameFor(now, who);
            // Gods needn't choose (the browser's picker stays shut).
            if (exempt(who)) return "Class: none|No class (gods needn't choose; class <name> to take one)";
            return "Class: unset. Choose one: " + choices(who) + ". Type class <name>, for example class fighter.";
        }
        if (arg.equals("choices")) {
            StringBuilder b = new StringBuilder("ClassChoices: ");
            boolean first = true;
            for (Def c : defs.values()) {
                if (!allowed(c, who) || c.hidden) continue;
                if (!first) b.append(';');
                first = false;
                b.append(c.id).append('|').append(nameFor(c, who)).append('|').append(c.blurb.replace(';', ',').replace('|', '/'));
            }
            return b.toString();
        }
        if (arg.equals("tiers")) {
            if (now == null) return "ClassTiers: ";
            StringBuilder b = new StringBuilder("ClassTiers: ");
            List<String> names = new ArrayList<String>();
            for (Def c : defs.values()) for (String s : c.core) if (!names.contains(s)) names.add(s);
            for (Def c : defs.values()) for (String s : c.barred) if (!names.contains(s)) names.add(s);
            for (String s : open) if (!names.contains(s)) names.add(s);
            for (String s : schools.keySet()) if (!names.contains(s)) names.add(s);
            boolean first = true;
            for (String s : names) {
                if (!first) b.append(';');
                first = false;
                Integer sm = schoolMax(who, s);
                b.append(s).append('=').append(exempt(who) ? "core" : sm != null ? (sm < 0 ? "barred" : "core") : tier(now, s));
            }
            return b.toString();
        }
        if (now != null) return "You're already a " + nameFor(now, who) + ". (A god can change it.)";
        Def c = find(arg, who);
        if (c == null) return "Choose one of: " + choices(who) + ".";
        if (!allowed(c, who)) return "A " + raceWords(who.strRace) + " can't be a " + nameFor(c, who) + ". Choose one of: " + choices(who) + ".";
        if (c.hidden) return "Nobody starts out as a " + nameFor(c, who) + " any more. Choose one of: " + choices(who) + ".";
        return choose((Player) who, engine, c);
    }

    static String raceWords(String race) {
        String r = race == null ? "" : race.trim().toLowerCase();
        return r.equals("darkelf") ? "dark elf" : r.length() == 0 ? "character of no race" : r;
    }

    static Def find(String s, LivingThing who) {
        load();
        String a = s.trim().toLowerCase();
        for (Def c : defs.values()) if (c.id.equals(a) || c.name.equalsIgnoreCase(a) || c.femaleName.equalsIgnoreCase(a)) return c;
        return null;
    }

    // ---- the starter kit -------------------------------------------------------

    // A class's start items and skills (not its stats, HP, MP or spell
    // groups): given on choosing, and once at login to anyone who chose
    // before the kits (the starter_kit flag says they have it).
    static final String KIT_FLAG = "starter_kit";
    static final List<String> STATS = Arrays.asList("stre", "inte", "dext", "cons", "wisd", "maxhp", "maxmp");

    static boolean inKit(String[] s) {
        if (s[0].equals("item")) return true;
        return !STATS.contains(s[0].toLowerCase()) && !s[0].toLowerCase().endsWith(" group");
    }

    // Gives the kit's items and raises its skills to their points (a skill
    // already as high is left); says what it gave ("" for nothing). The
    // flag goes on once every item fitted in the Backpack.
    static String giveKit(Player p, DuskEngine engine, Def c) {
        List<String> got = new ArrayList<String>(), learnt = new ArrayList<String>();
        boolean fitted = true;
        for (String[] s : c.start) {
            if (!inKit(s)) continue;
            try {
                if (s[0].equals("item")) {
                    if (p.hasCondition(KIT_FLAG)) continue;
                    Item it = engine.getItem(CaseFix.file("defItems", s[1]));
                    if (it == null) { Log.logEvent("Classes: no item " + s[1] + " for the " + c.id + " kit"); continue; }
                    if (p.items.add(it)) { p.updateItems(); got.add(s[1]); } else fitted = false;
                    continue;
                }
                int n = Integer.parseInt(s[1]), have = skillPoints(p, s[0]);
                if (n > have) {
                    p.learnSkill(s[0], n - have, 0);
                    learnt.add(s[0]);
                }
            } catch (Exception e) {
                Log.logError(e, "Classes: kit for " + p.strName + ": " + s[0], false);
            }
        }
        if (fitted && !p.hasCondition(KIT_FLAG)) {
            hiddenFlag(KIT_FLAG);
            Condition cond = engine.getCondition(KIT_FLAG);
            if (cond != null) p.addCondition(cond);
        }
        StringBuilder b = new StringBuilder();
        if (!got.isEmpty()) b.append("You get ").append(words(got, true)).append(" (in your Backpack: wear ").append(got.size() > 1 ? "them" : "it").append(")");
        if (!learnt.isEmpty()) b.append(b.length() > 0 ? " and learn " : "You learn ").append(words(learnt, false));
        if (b.length() > 0) b.append(".");
        if (!fitted) b.append(b.length() > 0 ? " " : "").append("Your Backpack is too full for the rest of your kit: make room and log in again.");
        return b.toString();
    }

    // "a short sword", "a hunting bow and an axe"; skills as they are.
    static String words(List<String> names, boolean article) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < names.size(); i++) {
            if (i > 0) b.append(i == names.size() - 1 ? " and " : ", ");
            String n = names.get(i);
            if (article) b.append("aeiou".indexOf(Character.toLowerCase(n.charAt(0))) >= 0 ? "an " : "a ");
            b.append(n);
        }
        return b.toString();
    }

    static void setFlag(Player p, DuskEngine engine, Def c) {
        for (Def other : defs.values()) p.removeCondition("class_" + other.id);
        hiddenFlag(c);
        Condition cond = engine.getCondition("class_" + c.id);
        if (cond != null) p.addCondition(cond);
    }

    // The choice: the flag, other classes' skills out (exp back), the start on.
    static String choose(Player p, DuskEngine engine, Def c) {
        setFlag(p, engine, c);
        if (!p.hasCondition("class_" + c.id)) return "Something went wrong; please tell a god.";
        StringBuilder note = new StringBuilder();
        long refund = 0;
        List<Object> gone = new ArrayList<Object>();
        for (Enumeration e = p.skillTable.keys(); e.hasMoreElements();) {
            Object k = e.nextElement();
            String tr = tier(c, String.valueOf(k));
            if (tr.equals("cross") || tr.equals("barred")) gone.add(k);
        }
        for (Object k : gone) {
            refund += (long) engine.traincost * ((Skill) p.skillTable.get(k)).value;
            p.skillTable.remove(k);
            note.append(note.length() > 0 ? ", " : "").append(k);
        }
        gone.clear();
        for (Enumeration e = p.spellTable.keys(); e.hasMoreElements();) {
            Object k = e.nextElement();
            if (schools.containsKey(String.valueOf(k).toLowerCase())) continue; // kept; see schools
            String tr = tier(c, String.valueOf(k));
            if (tr.equals("cross") || tr.equals("barred")) gone.add(k);
        }
        for (Object k : gone) {
            refund += (long) engine.traincost * ((Spell) p.spellTable.get(k)).value;
            p.spellTable.remove(k);
            note.append(note.length() > 0 ? ", " : "").append(k);
        }
        p.exp += refund;
        for (String[] s : c.start) {
            try {
                if (inKit(s)) continue; // giveKit, below
                int n = Integer.parseInt(s[1]);
                String stat = s[0].toLowerCase();
                if (stat.equals("stre") || stat.equals("inte") || stat.equals("dext") || stat.equals("cons") || stat.equals("wisd")) {
                    p.attributes.raiseStat(stat, n);
                } else if (stat.equals("maxhp") || stat.equals("maxmp")) {
                    int max = p.attributes.getStat(stat);
                    if (max + n < 1) n = 1 - max;
                    p.attributes.raiseStat(stat, n);
                    // A new class starts with a full bar of its own size.
                    String cur = stat.substring(3);
                    p.attributes.setStat(cur, p.attributes.getStat(stat));
                } else if (n > 0) {
                    p.learnSkill(s[0], n, 0);
                }
            } catch (Exception e) {
                Log.logError(e, "Classes: starting " + p.strName + " with " + s[0], false);
            }
        }
        String kit = giveKit(p, engine, c);
        p.updateInfo();
        p.updateStats();
        p.savePlayer();
        Log.logEvent(p.strName + " chose " + c.id + (note.length() > 0 ? " (took away " + note + ", " + refund + " exp back)" : ""));
        p.chatMessage("Class: " + c.id + "|" + nameFor(c, p) + "\n");
        String out = "You are now a " + nameFor(c, p) + "." + (kit.isEmpty() ? "" : " " + kit);
        if (note.length() > 0) out += " Another class's training was taken away (" + note + "); you get its " + refund + " exp back.";
        return out;
    }

    // The flag's condition file: hidden, as Sex makes them.
    static void hiddenFlag(Def c) {
        hiddenFlag("class_" + c.id);
    }

    // A hidden flag's condition file, made if missing: a player file naming
    // a condition with no file stops the whole server at their login.
    static void hiddenFlag(String name) {
        try {
            File f = new File("defConditions", name);
            if (!f.exists()) Talk.write(f, "nodisplay\n.\n".getBytes("UTF-8"));
        } catch (Exception e) {
            Log.logError(e, "Classes: making the " + name + " flag", false);
        }
    }
}
