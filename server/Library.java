/*
 * The game's definitions (monsters in defMobs, props in defProps, items
 * in defItems), for the God tab's editor, and monsters coming back after
 * they're killed.
 *
 *   lib get <kind> <name>             "Lib: <kind>|<name>|<file, base64>"
 *   lib set <kind> <name>|<base64>    save it (the old file is kept in
 *                                     backups/library/); placed monsters
 *                                     and props of that name change at once
 *   lib new <kind> <name>|<template>  a new one, a copy of <template> (or a
 *                                     plain starting file if none)
 * kind: mob, prop or item. Gods only.
 *
 *   godmap                            the whole world map, for gods' world
 *                                     map (no fog): "GodMap: <cx,cy> z:<data>"
 *                                     per 32x32 chunk, then "GodMap: done <n>"
 *                                     (the format of MapStore's chunks)
 *
 * Respawning: the engine moves a killed monster off the map with negative
 * HP, but nothing ever brought it back before a restart. Now it returns
 * to where it was placed, at full health, mobrespawnspeed seconds later
 * (conf/prefs). A monster's own file can say "respawn" and a number of
 * seconds instead (0: never).
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

public class Library {
    static final int GOD_PRIVS = 3;
    static final int MAX_FILE = 20000;

    static String dir(String kind) {
        return kind.equals("mob") ? "defMobs" : kind.equals("prop") ? "defProps" : kind.equals("item") ? "defItems" : kind.equals("script") ? "scripts" : null;
    }

    static boolean goodName(String name) {
        return name.matches("[A-Za-z0-9][A-Za-z0-9 _'.-]{0,39}") && !name.contains("..") && !name.endsWith(".dsko");
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        if (t.equalsIgnoreCase("godmap")) return who.privs < GOD_PRIVS ? "Only gods can see the whole map." : godMap(who, engine);
        if (!t.toLowerCase().startsWith("lib ")) return null;
        if (who.privs < GOD_PRIVS) return "Only gods can edit the game's definitions.";
        try {
            String[] p = t.substring(4).trim().split(" ", 3);
            if (p.length < 3) return "Usage: lib get|set|new <mob|prop|item|script> <name>";
            String op = p[0].toLowerCase(), kind = p[1].toLowerCase(), rest = p[2];
            String d = dir(kind);
            if (d == null) return "Kinds: mob, prop, item, script.";
            if (op.equals("get")) {
                String name = CaseFix.file(d, rest.trim());
                File f = new File(d, name);
                if (!goodName(name) || !f.isFile()) return "There's no " + kind + " called " + rest.trim() + ".";
                return "Lib: " + kind + "|" + name + "|" + Base64.getEncoder().encodeToString(Files.readAllBytes(f.toPath()));
            }
            int bar = rest.indexOf('|');
            String name = (bar < 0 ? rest : rest.substring(0, bar)).trim();
            String arg = bar < 0 ? "" : rest.substring(bar + 1).trim();
            if (!goodName(name)) return "Names are letters, numbers, spaces and _ ' . - (up to 40).";
            File f = new File(d, name);
            if (op.equals("new")) {
                if (new File(d, CaseFix.file(d, name)).exists()) return "There's already a " + kind + " called " + name + ".";
                byte[] body;
                if (arg.length() > 0) {
                    File from = new File(d, CaseFix.file(d, arg));
                    if (!from.isFile()) return "There's no " + kind + " called " + arg + " to copy.";
                    body = Files.readAllBytes(from.toPath());
                } else {
                    body = starter(kind).getBytes("UTF-8");
                }
                Talk.write(f, body);
                Log.logEvent(who.strName + " made a new " + kind + ": " + name + (arg.length() > 0 ? " (from " + arg + ")" : ""));
                return "Lib: saved " + kind + "|" + name + "|0";
            }
            if (op.equals("set")) {
                // Scripts (an item's use and wear scripts, from the item
                // maker) may be new; definitions must be made first.
                boolean script = kind.equals("script");
                if (!f.isFile() && !script) return "There's no " + kind + " called " + name + ".";
                byte[] body = Base64.getDecoder().decode(arg);
                if (body.length == 0 || body.length > MAX_FILE) return "That file is empty or too big.";
                String text = new String(body, "UTF-8").replace("\r", "");
                if (!text.endsWith("\n")) text += "\n";
                if (!script && !text.trim().endsWith(".")) text += ".\n";
                File keep = new File("backups/library");
                keep.mkdirs();
                if (f.isFile()) Files.copy(f.toPath(), new File(keep, kind + "-" + name + "." + new SimpleDateFormat("yyyyMMdd-HHmmss").format(new Date())).toPath(), StandardCopyOption.REPLACE_EXISTING);
                Talk.write(f, text.getBytes("UTF-8"));
                new File(d, name + ".dsko").delete();
                int n = kind.equals("mob") ? refreshMobs(engine, name) : kind.equals("prop") ? refreshProps(engine, name) : 0;
                respawnCache.remove(name.toLowerCase());
                Log.logEvent(who.strName + " edited " + kind + " " + name + " (" + n + " on the map updated)");
                return "Lib: saved " + kind + "|" + name + "|" + n;
            }
            return "Usage: lib get|set|new <mob|prop|item|script> <name>";
        } catch (IllegalArgumentException e) {
            return "That didn't arrive in one piece; try again.";
        } catch (Exception e) {
            Log.logError(e, "Library \"" + (t.length() > 60 ? t.substring(0, 60) : t) + "\" by " + who.strName, false);
            return "That didn't work: " + e.getMessage();
        }
    }

    static final int CHUNK = 32;

    // Every chunk of the map, deflated, a line each.
    static String godMap(LivingThing who, DuskEngine engine) {
        short[][] map = engine.shrMap;
        int cols = engine.mapColumns, rows = engine.mapRows, n = 0;
        byte[] raw = new byte[CHUNK * CHUNK * 2];
        byte[] buf = new byte[raw.length + 64];
        Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
        for (int cy = 0; cy * CHUNK < rows; cy++) {
            for (int cx = 0; cx * CHUNK < cols; cx++) {
                for (int ty = 0; ty < CHUNK; ty++) {
                    for (int tx = 0; tx < CHUNK; tx++) {
                        int x = cx * CHUNK + tx, y = cy * CHUNK + ty;
                        int v = x < cols && y < rows ? map[x][y] & 0xffff : 0xffff;
                        int i = (ty * CHUNK + tx) * 2;
                        raw[i] = (byte) v;
                        raw[i + 1] = (byte) (v >> 8);
                    }
                }
                java.util.zip.Deflater d = new java.util.zip.Deflater(9, true);
                d.setInput(raw);
                d.finish();
                int len = d.deflate(buf);
                d.end();
                who.chatMessage("GodMap: " + cx + "," + cy + " z:" + b64.encodeToString(java.util.Arrays.copyOf(buf, len)));
                n++;
            }
        }
        return "GodMap: done " + n;
    }

    static String starter(String kind) {
        if (kind.equals("mob")) return "maxhp\n20\nmaxmp\n0\nstre\n5\ninte\n1\ndext\n5\ncons\n5\nwisd\n1\nimage\n0\ndescription\nA new creature.\n.\n";
        if (kind.equals("script")) return "endscript\n";
        if (kind.equals("item")) return "type\nitem\ndescription\nA new item.\ncost\n10\nimage\n0\n.\n";
        return "image\n0\ndescription\nA new thing.\n.\n";
    }

    // Placed monsters of that name, made again from the new file where they
    // stand placed (any in a fight wait for the next respawn).
    static int refreshMobs(DuskEngine engine, String name) {
        int n = 0;
        for (Object o : engine.vctMobs.toArray()) {
            Mob old = (Mob) o;
            if (!old.strName.equalsIgnoreCase(name) || old.batBattle != null) continue;
            try {
                new Mob(name, Math.max(1, old.level), old.originalX, old.originalY, engine);
                engine.vctMobs.removeElement(old);
                engine.removeDuskObject(old);
                n++;
            } catch (Exception e) {
                Log.logError(e, "Library: remaking " + name, false);
            }
        }
        return n;
    }

    // Placed props of that name take the new picture and description.
    static int refreshProps(DuskEngine engine, String name) {
        int image = -1;
        String desc = null;
        try {
            java.util.List<String> lines = Files.readAllLines(new File("defProps", name).toPath());
            for (int i = 0; i + 1 < lines.size(); i++) {
                String k = lines.get(i).trim().toLowerCase();
                if (k.equals("image") && image < 0) image = Integer.parseInt(lines.get(i + 1).trim());
                if (k.equals("description") && desc == null) desc = lines.get(i + 1);
            }
        } catch (Exception e) {
            return 0;
        }
        int n = 0;
        for (Object o : engine.vctProps.toArray()) {
            Prop p = (Prop) o;
            if (p instanceof Storage || p.strName == null || !p.strName.equalsIgnoreCase(name)) continue;
            engine.removeDuskObject(p);
            if (image >= 0) p.intImage = image;
            if (desc != null) p.strDescription = desc;
            engine.addDuskObject(p);
            n++;
        }
        return n;
    }

    // ---- respawning ----

    static final Map<String, Integer> respawnCache = new HashMap<String, Integer>();

    // A monster's own respawn time in seconds, or -1 for the server's.
    static int respawnOf(String name) {
        String key = name.toLowerCase();
        Integer cached = respawnCache.get(key);
        if (cached != null) return cached;
        int s = -1;
        try {
            java.util.List<String> lines = Files.readAllLines(new File("defMobs", CaseFix.file("defMobs", name)).toPath());
            for (int i = 0; i + 1 < lines.size(); i++) if (lines.get(i).trim().equalsIgnoreCase("respawn")) s = Integer.parseInt(lines.get(i + 1).trim());
        } catch (Exception e) {
            // The server's time, then.
        }
        respawnCache.put(key, s);
        return s;
    }

    // When each monster was found dead (off the map).
    static final Map<Mob, Long> deadSince = new java.util.IdentityHashMap<Mob, Long>();

    public static void startRespawning(final DuskEngine engine) {
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        Thread.sleep(1000);
                        long now = System.currentTimeMillis();
                        Object[] mobs = engine.vctMobs.toArray();
                        java.util.Set<Mob> here = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Mob, Boolean>());
                        for (Object o : mobs) {
                            Mob m = (Mob) o;
                            here.add(m);
                            if (m.intLocX != -6) { deadSince.remove(m); continue; }
                            if (m.batBattle != null) continue;
                            Long since = deadSince.get(m);
                            if (since == null) { deadSince.put(m, now); continue; }
                            int own = respawnOf(m.strName);
                            if (own == 0) continue; // stays gone
                            int secs = own > 0 ? own : Math.max(1, -engine.mobrespawnspeed);
                            if (now - since < secs * 1000L) continue;
                            deadSince.remove(m);
                            m.attributes.setStat("hp", m.attributes.getStat("maxhp"));
                            m.attributes.setStat("mp", m.attributes.getStat("maxmp"));
                            m.changeLocBypass(m.originalX, m.originalY);
                        }
                        deadSince.keySet().retainAll(here); // removed for good
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Library respawn", false);
                    }
                }
            }
        }, "Respawn");
        t.setDaemon(true);
        t.start();
    }
}
