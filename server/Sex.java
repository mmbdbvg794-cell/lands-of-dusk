/*
 * A character's sex, male or female, chosen once and kept as a hidden flag
 * ("male" or "female"), so scripts and talk can ask hasCondition trigger
 * female. Anyone without "female" counts as male, including characters
 * that haven't chosen yet (players of the old Java client never get asked).
 *
 * The look: each race's image in players.gif has a female one after it
 * (FEMALE). The engine sets everyone's image from their race at every
 * login (Player.loadRace), so PlayerPatch calls afterRace at the end of
 * loadRace, before anyone sees them, and the female image goes on there.
 *
 *   sex                       "Sex: male" | "Sex: female" | "Sex: unset"
 *                             (the browser client asks after logging in
 *                             and offers the choice when it's unset)
 *   sex male|female           choose, once
 *   setsex <name> male|female gods: change it for a player who's online
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;

public class Sex {
    static final int GOD_PRIVS = 3;
    // Race image -> its female image (human, elf, dark elf, lizardman).
    static final int[][] FEMALE = { { 0, 8 }, { 1, 9 }, { 2, 10 }, { 6, 11 } };

    static int femaleImage(int image) {
        for (int[] f : FEMALE) if (f[0] == image) return f[1];
        return image;
    }

    static int maleImage(int image) {
        for (int[] f : FEMALE) if (f[1] == image) return f[0];
        return image;
    }

    // "male", "female" or null (not chosen).
    static String of(LivingThing who) {
        if (who.hasCondition("female")) return "female";
        if (who.hasCondition("male")) return "male";
        return null;
    }

    // At login, once the race has set the image.
    public static void afterRace(Player p) {
        try {
            if (p.hasCondition("female")) p.intImage = femaleImage(p.intImage);
        } catch (Exception e) {
            Log.logError(e, "Sex.afterRace for " + p.strName, false);
        }
        // (The one hook at login: the old Java client's players also get a tip.)
        Talk.classicTip(p);
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        String lower = t.toLowerCase();
        if (lower.startsWith("setsex ")) {
            if (who.privs < GOD_PRIVS) return "Only gods can change that.";
            String[] a = t.substring(7).trim().split("\\s+");
            if (a.length != 2 || !(a[1].equalsIgnoreCase("male") || a[1].equalsIgnoreCase("female"))) return "Usage: setsex <name> male|female";
            Player p = Bans.online(engine, a[0]);
            if (p == null) return a[0] + " isn't online.";
            set(p, engine, a[1].equalsIgnoreCase("female"));
            p.chatMessage("A god has made your character " + a[1].toLowerCase() + ".\n");
            Log.logEvent(who.strName + " made " + p.strName + " " + a[1].toLowerCase());
            return p.strName + " is now " + a[1].toLowerCase() + ".";
        }
        if (!(lower.equals("sex") || lower.startsWith("sex "))) return null;
        if (!(who instanceof Player)) return null;
        String now = of(who);
        String arg = lower.substring(3).trim();
        if (arg.length() == 0) return "Sex: " + (now == null ? "unset" : now);
        if (!(arg.equals("male") || arg.equals("female"))) return "Usage: sex male|female";
        if (now != null) return "You're already " + now + ". (A god can change it.)";
        set((Player) who, engine, arg.equals("female"));
        return "Sex: " + arg;
    }

    // Sets the flag and the look, shows the look to everyone nearby, saves.
    static void set(Player p, DuskEngine engine, boolean female) {
        hiddenFlag("male");
        hiddenFlag("female");
        p.removeCondition(female ? "male" : "female");
        if (!p.hasCondition(female ? "female" : "male")) {
            Condition c = engine.getCondition(female ? "female" : "male");
            if (c != null) p.addCondition(c);
        }
        int image = female ? femaleImage(maleImage(p.intImage)) : maleImage(p.intImage);
        if (image != p.intImage) {
            p.intImage = image;
            String msg = "\u001f" + p.ID + "\n" + image + "\n";
            Object[] socks;
            synchronized (engine.vctSockets) {
                socks = engine.vctSockets.toArray();
            }
            int range = engine.viewrange + 1;
            for (Object o : socks) {
                if (!(o instanceof Player)) continue;
                Player q = (Player) o;
                if (Math.abs(q.intLocX - p.intLocX) > range || Math.abs(q.intLocY - p.intLocY) > range) continue;
                try {
                    q.send(msg);
                } catch (Exception e) {
                    // They'll see it next time it comes into view.
                }
            }
        }
        p.savePlayer();
    }

    // The flag's condition file: hidden, like the editors make.
    static void hiddenFlag(String name) {
        try {
            File f = new File("defConditions", name);
            if (!f.exists()) Talk.write(f, "nodisplay\n.\n".getBytes("UTF-8"));
        } catch (Exception e) {
            Log.logError(e, "Sex: making the " + name + " flag", false);
        }
    }
}
