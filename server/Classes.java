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
 *   - what gear each class may wear, by the words in an item's name.
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
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Enumeration;
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
        "blurb fighter Weapons and armour of every kind; strikes twice, three and four times.",
        "blurb mage Black magic, enchantments and summons. Staff and dagger, light armour; no holy magic or weapon skills.",
        "blurb cleric Healing and holy magic: mend, bless, prayer. Any armour; staves and blunt weapons.",
        "blurb priest Healing and the Spider Queen's favour: mend, bless, prayer. Any armour; staves and blunt weapons.",
        "blurb ranger Druidic magic, dodging and quick blades. Light armour, bows and spears.",
        "blurb paladin A warrior blessed: weapons and armour, with healing and blessings.",
        "",
        "# races <id> <race>, ... : who may choose it (-race: everyone but). No line: everyone.",
        "races cleric -darkelf",
        "races priest darkelf",
        "",
        "# core <id> <names>: normal price. open <names>: normal price for everyone.",
        "# barred <id> <names>: this class can't train them at all.",
        "core fighter Dodge, Double Attack, Triple Attack, Quadruple Attack",
        "core mage Spell Power, black magic group, enchantment group, summons group, hells fire",
        "core cleric Spell Power, clerical group, white magic group",
        "core priest Spell Power, clerical group, white magic group",
        "core ranger Dodge, Double Attack, Triple Attack, Lock Picking, druidic group",
        "core paladin Dodge, Double Attack, Spell Power, clerical group",
        "barred mage Dodge, Double Attack, Triple Attack, Quadruple Attack, clerical group, white magic group",
        "open Regeneration, Mana Regen, Armor Identification, Mana Tap, Life Tap, telepathy group, alchemy group, m group",
        "open Mining, Herbalism, Woodcutting, Smithing, Alchemy, Fletching",
        "",
        "# start <id> <what> <n>, ... : on choosing. Stats stre inte dext cons wisd, maxhp, maxmp;",
        "# a skill or spell group and its points; item <name>.",
        "start fighter stre 3, cons 1, maxhp 10, maxmp -10, Dodge 5",
        "start mage inte 3, wisd 1, maxhp -5, maxmp 10, black magic group 1, item quarter staff",
        "start cleric wisd 3, inte 1, maxhp 2, maxmp 5, clerical group 1",
        "start priest wisd 3, inte 1, maxhp 2, maxmp 5, clerical group 1",
        "start ranger dext 3, stre 1, maxhp 5, maxmp -5, druidic group 1",
        "start paladin stre 2, wisd 2, maxhp 7, maxmp -2, clerical group 1",
        "",
        "# growth <id> <max HP per point> <max MP per point>, bought at a trainer (else 10 and 10)",
        "growth fighter 12 8",
        "growth mage 8 12",
        "growth cleric 10 11",
        "growth priest 10 11",
        "growth ranger 11 9",
        "growth paladin 11 10",
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
        "");

    static class Def {
        String id, name, femaleName, blurb = "";
        List<String> races = new ArrayList<String>(), notRaces = new ArrayList<String>();
        List<String> core = new ArrayList<String>(), barred = new ArrayList<String>(), wears = null;
        List<String[]> start = new ArrayList<String[]>();
        int hpPer = 10, mpPer = 10;
    }

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
        try {
            List<String> lines = m > 0 ? Files.readAllLines(f.toPath()) : java.util.Arrays.asList(DEFAULTS.split("\n"));
            for (String line : lines) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                String[] w = line.split("\\s+", 3);
                String key = w[0].toLowerCase();
                try {
                    if (key.equals("multiplier")) mult = Math.max(1, Integer.parseInt(w[1]));
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
        long cost = (long) m.engGame.traincost * n * multiplier;
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
        return null;
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
        if (c == null || c.wears == null) return null;
        Item item;
        try {
            item = who.items.getItem(Integer.valueOf(what));
        } catch (Exception e) {
            return null; // the engine's own answer
        }
        if (item == null || (item.intType != 1 && item.intType != 2 && item.intType != 5)) return null;
        String kind = kindOf(item);
        if (c.wears.contains(kind)) return null;
        String words = kind.equals("heavy") ? "heavy armour" : kind.equals("light") ? "light armour" : kind.equals("blade") ? "bladed weapons" : kind + "s";
        return "A " + nameFor(c, who) + " can't use " + words + " (the " + item.strName + ").";
    }

    // ---- at login (from Sex.afterRace) ----------------------------------------

    public static void atLogin(Player p) {
        try {
            if (exempt(p) || of(p) != null) return;
            p.chatMessage("Before you set out, choose your class: " + choices(p) + ". Type class <name> (for example: class fighter). You choose once.\n");
        } catch (Exception e) {
            Log.logError(e, "Classes.atLogin for " + p.strName, false);
        }
    }

    static String choices(LivingThing who) {
        StringBuilder b = new StringBuilder();
        for (Def c : defs.values()) {
            if (!allowed(c, who)) continue;
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
                if (!allowed(c, who)) continue;
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
            boolean first = true;
            for (String s : names) {
                if (!first) b.append(';');
                first = false;
                b.append(s).append('=').append(exempt(who) ? "core" : tier(now, s));
            }
            return b.toString();
        }
        if (now != null) return "You're already a " + nameFor(now, who) + ". (A god can change it.)";
        Def c = find(arg, who);
        if (c == null) return "Choose one of: " + choices(who) + ".";
        if (!allowed(c, who)) return "A " + raceWords(who.strRace) + " can't be a " + nameFor(c, who) + ". Choose one of: " + choices(who) + ".";
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
                if (s[0].equals("item")) {
                    Item it = engine.getItem(CaseFix.file("defItems", s[1]));
                    if (it != null && p.items.add(it)) p.updateItems();
                    continue;
                }
                int n = Integer.parseInt(s[1]);
                String stat = s[0].toLowerCase();
                if (stat.equals("stre") || stat.equals("inte") || stat.equals("dext") || stat.equals("cons") || stat.equals("wisd")) {
                    p.attributes.raiseStat(stat, n);
                } else if (stat.equals("maxhp") || stat.equals("maxmp")) {
                    int max = p.attributes.getStat(stat);
                    if (max + n < 1) n = 1 - max;
                    p.attributes.raiseStat(stat, n);
                    String cur = stat.substring(3);
                    int over = p.attributes.getStat(cur) - p.attributes.getStat(stat);
                    if (over > 0) p.attributes.raiseStat(cur, -over);
                } else if (n > 0) {
                    p.learnSkill(s[0], n, 0);
                }
            } catch (Exception e) {
                Log.logError(e, "Classes: starting " + p.strName + " with " + s[0], false);
            }
        }
        p.updateInfo();
        p.updateStats();
        p.savePlayer();
        Log.logEvent(p.strName + " chose " + c.id + (note.length() > 0 ? " (took away " + note + ", " + refund + " exp back)" : ""));
        p.chatMessage("Class: " + c.id + "|" + nameFor(c, p) + "\n");
        String out = "You are now a " + nameFor(c, p) + ".";
        if (note.length() > 0) out += " Another class's training was taken away (" + note + "); you get its " + refund + " exp back.";
        return out;
    }

    // The flag's condition file: hidden, as Sex makes them.
    static void hiddenFlag(Def c) {
        try {
            File f = new File("defConditions", "class_" + c.id);
            if (!f.exists()) Talk.write(f, "nodisplay\n.\n".getBytes("UTF-8"));
        } catch (Exception e) {
            Log.logError(e, "Classes: making the class_" + c.id + " flag", false);
        }
    }
}
