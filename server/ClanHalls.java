/*
 * Clan halls: the old halls (emptied by tools/server/clear_clan_halls.py)
 * handed to a clan by a god, and back again.
 *
 *   claimhall                      (gods) the halls and who holds them
 *   claimhall <clan>               (gods) give the hall you stand in to a clan
 *   claimhall <hall> <clan>        (gods) give a hall by its name
 *   claimhall <hall> none          (gods) take it back: open, and claimable
 *
 * The halls are in the game file "clanhalls", a line each:
 *   name|x0,y0,x1,y1|doors|portals|inside x,y|clan
 * doors: "x,y,dx,dy;..." squares in a hall's doorway, and the way back out
 * (one who isn't in the clan is pushed dx,dy); portals: "x,y;..." squares
 * elsewhere that take people into the hall (DD's hall has no door). clan
 * is empty while a hall is free. Claiming rewrites the doors' and portals'
 * walk-on scripts (defMoveActions, read from disk at every step, so it
 * works at once): members go in and are welcomed, everyone else is turned
 * back with the clan's name; a free hall's say it can be claimed.
 *
 * Clans.command hands "claimhall" here; "clan" shows a member their hall.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

public class ClanHalls {
    static final String FILE = "clanhalls";
    static final String FREE = " This clan hall stands empty. It can be claimed by a new clan: ask a god.";

    static class Hall {
        String name, clan = "";
        int x0, y0, x1, y1, inX, inY;
        List<int[]> doors = new ArrayList<int[]>(), portals = new ArrayList<int[]>();

        boolean holds(int x, int y) {
            return x >= x0 && x <= x1 && y >= y0 && y <= y1;
        }

        String line() {
            StringBuilder d = new StringBuilder(), p = new StringBuilder();
            for (int[] a : doors) d.append(d.length() > 0 ? ";" : "").append(a[0]).append(',').append(a[1]).append(',').append(a[2]).append(',').append(a[3]);
            for (int[] a : portals) p.append(p.length() > 0 ? ";" : "").append(a[0]).append(',').append(a[1]);
            return name + "|" + x0 + "," + y0 + "," + x1 + "," + y1 + "|" + d + "|" + p + "|" + inX + "," + inY + "|" + clan;
        }
    }

    static int[] ints(String s) {
        String[] p = s.split(",");
        int[] out = new int[p.length];
        for (int i = 0; i < p.length; i++) out[i] = Integer.parseInt(p[i].trim());
        return out;
    }

    static List<Hall> load() throws Exception {
        List<Hall> out = new ArrayList<Hall>();
        File f = new File(FILE);
        if (!f.isFile()) return out;
        for (String l : new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8).replace("\r", "").split("\n")) {
            if (l.trim().isEmpty() || l.startsWith("#")) continue;
            String[] p = l.split("\\|", -1);
            if (p.length < 6) continue;
            Hall h = new Hall();
            h.name = p[0].trim();
            int[] box = ints(p[1]);
            h.x0 = box[0]; h.y0 = box[1]; h.x1 = box[2]; h.y1 = box[3];
            for (String d : p[2].split(";")) if (!d.trim().isEmpty()) h.doors.add(ints(d));
            for (String d : p[3].split(";")) if (!d.trim().isEmpty()) h.portals.add(ints(d));
            int[] in = ints(p[4]);
            h.inX = in[0]; h.inY = in[1];
            h.clan = p[5].trim();
            out.add(h);
        }
        return out;
    }

    static void save(List<Hall> halls) throws Exception {
        StringBuilder b = new StringBuilder("# Clan halls (server/ClanHalls.java): name|x0,y0,x1,y1|doors x,y,dx,dy;...|portals x,y;...|inside x,y|clan\n");
        for (Hall h : halls) b.append(h.line()).append('\n');
        Talk.write(new File(FILE), b.toString().getBytes(StandardCharsets.UTF_8));
    }

    // The hall a member's clan holds, or null.
    static String hallOf(String clan) {
        try {
            for (Hall h : load()) if (!h.clan.isEmpty() && h.clan.equalsIgnoreCase(clan)) return h.name + " (" + h.inX + ", " + h.inY + ")";
        } catch (Exception e) {
            // no halls file: no hall
        }
        return null;
    }

    static String command(Player me, DuskEngine engine, String args) {
        if (me.privs < Clans.GOD) return "Only a god can hand out clan halls.";
        try {
            synchronized (ClanHalls.class) {
                List<Hall> halls = load();
                if (halls.isEmpty()) return "There are no clan halls (no " + FILE + " file).";
                if (args.isEmpty()) {
                    StringBuilder b = new StringBuilder("Clan halls:");
                    for (Hall h : halls) b.append(' ').append(h.name).append(" (").append(h.inX).append(", ").append(h.inY).append("): ").append(h.clan.isEmpty() ? "free" : h.clan).append(';');
                    b.setLength(b.length() - 1);
                    return b.append(". claimhall <clan> gives the one you stand in, claimhall <hall> <clan> any; none frees it.").toString();
                }
                // "<hall> <clan>", or "<clan>" for the hall you stand in.
                Hall hall = null;
                String clan = args;
                int sp = args.indexOf(' ');
                String first = sp < 0 ? args : args.substring(0, sp);
                for (Hall h : halls) if (h.name.equalsIgnoreCase(first)) hall = h;
                if (hall != null) {
                    if (sp < 0) return "Give " + hall.name + " to which clan? claimhall " + hall.name + " <clan> (none frees it).";
                    clan = args.substring(sp + 1).trim();
                } else {
                    for (Hall h : halls) if (h.holds(me.intLocX, me.intLocY)) hall = h;
                    if (hall == null) return "You're not in a clan hall. claimhall lists them; claimhall <hall> <clan> works from anywhere.";
                }
                if (clan.matches(".*[\"|\\\\].*")) return "A clan name can't have \" | or \\ in it.";
                boolean free = clan.equalsIgnoreCase("none");
                if (!free) clan = Clans.spelling(engine, clan);
                for (Hall h : halls) {
                    if (h != hall && !free && h.clan.equalsIgnoreCase(clan)) return clan + " holds " + h.name + " already; claimhall " + h.name + " none first.";
                }
                String was = hall.clan;
                hall.clan = free ? "" : clan;
                write(hall);
                save(halls);
                if (!was.isEmpty()) Clans.tellClan(engine, was, "Your clan no longer holds its hall, " + hall.name + ".");
                if (!free) Clans.tellClan(engine, clan, "Your clan now holds a hall: " + hall.name + ", at " + hall.inX + ", " + hall.inY + ". Only your clan can go in.");
                return free ? hall.name + " is free again (its doors say it can be claimed)." : hall.name + " now belongs to " + clan + ": only its members can go in.";
            }
        } catch (Exception e) {
            Log.logError(e, "claimhall " + args, false);
            return "Something went wrong.";
        }
    }

    // The walk-on scripts for a hall's doors and portals.
    static void write(Hall h) throws Exception {
        boolean free = h.clan.isEmpty();
        String q = "\"" + h.clan + "\"";
        for (int[] d : h.doors) {
            String push = d[2] != 0 ? "inc trigger locx " + d[2] : "inc trigger locy " + d[3];
            script(d[0], d[1], "if ispet trigger\nendscript\nend\n" + (free
                ? "chat trigger \"" + FREE + "\"\nendscript\n"
                : "if ! isclan trigger " + q + "\n" + push + "\nchat trigger \" This hall belongs to the clan " + h.clan + ".\"\nendscript\nend\nchat trigger \" Welcome to the " + h.clan + " clan hall.\"\nendscript\n"));
        }
        for (int[] p : h.portals) {
            String in = "set trigger locxy " + h.inX + " " + h.inY + "\n";
            script(p[0], p[1], "if ispet trigger\nendscript\nend\n" + (free
                ? in + "chat trigger \"" + FREE.trim() + "\"\nendscript\n"
                : "if ! isclan trigger " + q + "\nendscript\nend\n" + in + "chat trigger \" Welcome to the " + h.clan + " clan hall.\"\nendscript\n"));
        }
    }

    static void script(int x, int y, String text) throws Exception {
        String base = "defMoveActions/" + x + "_" + y;
        Talk.write(new File(base), text.getBytes(StandardCharsets.ISO_8859_1));
        new File(base + ".dsko").delete();
        new File("tileactions/" + x + "_" + y + ".json").delete();
    }
}
