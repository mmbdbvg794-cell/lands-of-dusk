/*
 * Clans, done without the engine's blocking prompts. The engine's own
 * clan commands (Commands.parseCommand) only work for clan leaders and
 * gods (privs > 0), so an ordinary member could never leave; and its
 * addmember and unclan wait for a "yes" read straight off the player's
 * socket, holding the asker's command thread meanwhile. These replace them
 * (Props.command hands them over before the engine sees them):
 *
 *   clan                       your clan, and who in it is in the game
 *   clan members               everyone in it, in the game or not
 *   clan invite <name>         (a leader) ask someone in the game, who's in
 *                              no clan, to join; also "addmember <name>"
 *   clan accept | decline      answer an invitation (2 minutes)
 *   clan leave                 leave ("clan leave yes" to be sure); also
 *                              "unclan"
 *   clan kick <name>           (a leader, or a god) put a member out, in
 *                              the game or not; also "kick <name>"
 *
 * A leader is a player with privs 1 (the god command "clanleader <player>
 * <clan>" makes one); leaving or being kicked out ends that. The gods'
 * clanleader and changeclan are handled here too, so the clan name keeps
 * its capitals (the engine lower-cases the whole command). Gods (privs
 * 3+) lead whatever clan they're in. Clan chat is the engine's ":" (every
 * member in the game hears "<name> clans: <text>").
 *
 * The browser gets "ClanInvite: <from>|<clan>" for its Join / No thanks
 * box (js/party.js), the classic client the plain line.
 *
 * The gods' claimhall (a clan hall for a clan) is server/ClanHalls.java.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Clans {
    static final long INVITE_MS = 2 * 60 * 1000;
    static final int LEADER = 1, GOD = 3;

    static final Map<String, String[]> invites = new HashMap<String, String[]>(); // invitee -> {from, clan}
    static final Map<String, Long> invitedAt = new HashMap<String, Long>();

    static boolean none(String clan) {
        return clan == null || clan.equalsIgnoreCase("none") || clan.equals(Duel.CLAN);
    }

    static boolean leads(LivingThing who) {
        return !none(who.strClan) && (who.privs == LEADER || who.privs >= GOD);
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        if (!(who instanceof Player)) return null;
        String t = line.trim();
        String lower = t.toLowerCase();
        String[] a = t.split("\\s+", 3);
        String verb, arg;
        if (lower.equals("clan") || lower.startsWith("clan ")) {
            verb = a.length > 1 ? a[1].toLowerCase() : "";
            arg = a.length > 2 ? a[2].trim() : "";
        } else if (lower.startsWith("addmember ")) {
            verb = "invite";
            arg = t.substring(10).trim();
        } else if (lower.equals("unclan") || lower.equals("unclan yes")) {
            verb = "leave";
            arg = lower.equals("unclan yes") ? "yes" : "";
        } else if (lower.startsWith("kick ")) {
            verb = "kick";
            arg = t.substring(5).trim();
        } else if (lower.equals("claimhall") || lower.startsWith("claimhall ")) {
            return ClanHalls.command((Player) who, engine, t.substring(9).trim());
        } else if ((lower.startsWith("clanleader ") || lower.startsWith("changeclan ")) && who.privs >= GOD) {
            verb = lower.substring(0, 10);
            arg = t.substring(11).trim();
        } else {
            return null;
        }
        Player me = (Player) who;
        synchronized (Clans.class) {
            switch (verb) {
                case "": return status(me, engine);
                case "members": return members(me, engine);
                case "invite": return invite(me, engine, arg);
                case "accept": return answer(me, engine, true);
                case "decline": return answer(me, engine, false);
                case "leave": return leave(me, engine, arg);
                case "kick": return kick(me, engine, arg);
                case "clanleader": return setClan(me, engine, arg, true);
                case "changeclan": return setClan(me, engine, arg, false);
                default:
                    return "Clan commands: clan, clan members, clan invite <name>, clan accept, clan decline, clan leave, clan kick <name>. Talk to your clan with : at the start of a line.";
            }
        }
    }

    static String status(Player me, DuskEngine engine) {
        if (none(me.strClan)) {
            String[] inv = pending(me.strName);
            return "You're not in a clan." + (inv != null ? " " + inv[0] + " has asked you to join " + inv[1] + " (clan accept or clan decline)." : "");
        }
        List<String> on = new ArrayList<String>();
        for (Player p : Mail.online(engine).values()) {
            if (me.strClan.equals(p.strClan)) on.add(p.strName + (p.privs == LEADER ? " (leader)" : ""));
        }
        String hall = ClanHalls.hallOf(me.strClan);
        return "You're in the clan " + me.strClan + (me.privs == LEADER ? ", and you lead it" : "") + ". In the game: " + String.join(", ", on) + "." + (hall != null ? " Your hall: " + hall + "." : "") + " Talk to them with : at the start of a line.";
    }

    static String members(Player me, DuskEngine engine) {
        if (none(me.strClan)) return "You're not in a clan.";
        Map<String, Player> on = Mail.online(engine);
        List<String> out = new ArrayList<String>();
        File[] users = new File("users").listFiles();
        if (users != null) {
            for (File f : users) {
                String n = f.getName();
                if (n.endsWith(".backup") || n.contains(".")) continue;
                Player p = on.get(n.toLowerCase());
                String clan = p != null ? p.strClan : value(f, "clan");
                if (!me.strClan.equalsIgnoreCase(clan == null ? "" : clan)) continue;
                String privs = p != null ? String.valueOf(p.privs) : value(f, "privs");
                out.add((p != null ? p.strName : n) + ("1".equals(privs) ? " (leader)" : "") + (p != null ? " *" : ""));
            }
        }
        return me.strClan + ": " + String.join(", ", out) + " (* in the game)";
    }

    static String invite(Player me, DuskEngine engine, String name) {
        if (none(me.strClan)) return "You're not in a clan.";
        if (!leads(me)) return "Only a leader of " + me.strClan + " can invite.";
        if (name.length() == 0) return "Invite who? clan invite <name>";
        Player p = Party.named(Mail.online(engine), name);
        if (p == null) return "There's nobody called " + name + " in the game.";
        if (p == me) return "You're in your clan already.";
        if (!none(p.strClan)) return p.strName + " is in " + (p.strClan.equalsIgnoreCase(me.strClan) ? "your clan already" : "another clan (" + p.strClan + ")") + ".";
        String key = p.strName.toLowerCase();
        invites.put(key, new String[] {me.strName, me.strClan});
        invitedAt.put(key, System.currentTimeMillis());
        if (BridgedSocket.browser(p.sckConnection)) p.chatMessage("ClanInvite: " + me.strName + "|" + me.strClan + "\n");
        p.chatMessage(me.strName + " asks you to join the clan " + me.strClan + " (clan accept, or clan decline).\n");
        return "You asked " + p.strName + " to join " + me.strClan + ".";
    }

    static String[] pending(String name) {
        String key = name.toLowerCase();
        Long at = invitedAt.get(key);
        if (at == null || System.currentTimeMillis() - at > INVITE_MS) {
            invites.remove(key);
            invitedAt.remove(key);
            return null;
        }
        return invites.get(key);
    }

    static String answer(Player me, DuskEngine engine, boolean yes) {
        String[] inv = pending(me.strName);
        invites.remove(me.strName.toLowerCase());
        invitedAt.remove(me.strName.toLowerCase());
        if (inv == null) return "Nobody has asked you to join a clan (or it was more than two minutes ago).";
        Player from = Mail.online(engine).get(inv[0].toLowerCase());
        if (!yes) {
            if (from != null) from.chatMessage(me.strName + " won't join " + inv[1] + ".\n");
            return "You turned down " + inv[1] + ".";
        }
        if (!none(me.strClan)) return "You're in " + me.strClan + " already; clan leave first.";
        if (me.batBattle != null) return "Finish your fight first, then clan accept again (ask for a new invitation if it runs out).";
        // The one who asked must still lead that clan.
        if (from == null || !inv[1].equals(from.strClan) || !leads(from)) return inv[0] + " can't take you into " + inv[1] + " any more; ask for a new invitation.";
        me.strClan = inv[1];
        if (me.privs == LEADER) me.privs = 0;
        for (Player p : Mail.online(engine).values()) {
            if (p != me && inv[1].equals(p.strClan)) p.chatMessage(me.strName + " has joined " + inv[1] + ".\n");
        }
        return "You have joined the clan " + inv[1] + ". Talk to your clan with : at the start of a line.";
    }

    static String leave(Player me, DuskEngine engine, String arg) {
        if (none(me.strClan)) return "You're not in a clan.";
        if (me.batBattle != null) return "Wait until you're done fighting.";
        if (!arg.equalsIgnoreCase("yes")) return "Leave " + me.strClan + "? Type clan leave yes to be sure.";
        String was = me.strClan;
        me.strClan = "none";
        if (me.privs == LEADER) me.privs = 0;
        tellClan(engine, was, me.strName + " has left " + was + ".");
        return "You have left " + was + ".";
    }

    static String kick(Player me, DuskEngine engine, String name) {
        boolean god = me.privs >= GOD;
        if (!god && !leads(me)) return none(me.strClan) ? "You're not in a clan." : "Only a leader of " + me.strClan + " can put someone out.";
        if (name.length() == 0) return "Kick who? clan kick <name>";
        Player p = Party.named(Mail.online(engine), name);
        if (p != null) {
            if (p == me) return "To leave, type clan leave.";
            if (none(p.strClan) || (!god && !p.strClan.equalsIgnoreCase(me.strClan))) return p.strName + " isn't in your clan.";
            if (p.batBattle != null) return p.strName + " is fighting; try again after.";
            String was = p.strClan;
            p.strClan = "none";
            if (p.privs == LEADER) p.privs = 0;
            p.chatMessage("You have been put out of " + was + " by " + me.strName + ".\n");
            return p.strName + " is out of " + was + ".";
        }
        // Not in the game: their file (and its .backup, which the server
        // also loads from).
        File f = new File("users", name.toLowerCase());
        if (name.contains("/") || name.contains(".") || !f.isFile()) return "There's no one called " + name + ".";
        String clan = value(f, "clan");
        if (none(clan) || (!god && !clan.equalsIgnoreCase(me.strClan))) return name + " isn't in your clan.";
        try {
            for (File g : new File[] {f, new File("users", name.toLowerCase() + ".backup")}) {
                if (!g.isFile()) continue;
                String text = new String(Files.readAllBytes(g.toPath()), StandardCharsets.ISO_8859_1);
                text = setValue(setValue(text, "clan", "none"), "privs", "1".equals(value(g, "privs")) ? "0" : null);
                Talk.write(g, text.getBytes(StandardCharsets.ISO_8859_1));
            }
        } catch (Exception e) {
            Log.logError(e, "clan kick " + name, false);
            return "Something went wrong.";
        }
        return name + " is out of " + clan + " (they'll find out when they next come in).";
    }

    // The gods' clanleader and changeclan, as the engine's but keeping the
    // clan name as typed (the engine lower-cases the whole command), or as
    // an existing clan spells it, so its members share one clan chat.
    static String setClan(Player me, DuskEngine engine, String args, boolean leader) {
        int sp = args.indexOf(' ');
        if (sp < 0) return (leader ? "clanleader" : "changeclan") + " <player> <clan> (none to take them out)";
        Player p = Party.named(Mail.online(engine), args.substring(0, sp));
        if (p == null) return "They're not in this world.";
        String clan = args.substring(sp + 1).trim();
        if (leader && p.privs > LEADER && me.privs < 5) return "You can't clanleader them.";
        if (clan.equalsIgnoreCase("none")) clan = "none";
        else clan = spelling(engine, clan);
        p.strClan = clan;
        if (leader) p.privs = clan.equals("none") ? 0 : LEADER;
        else if (p.privs == LEADER) p.privs = 0;
        if (clan.equals("none")) {
            p.chatMessage("You are now in no clan.\n");
            return p.strName + " is now in no clan.";
        }
        p.chatMessage((leader ? "You now lead the clan " : "You are now a member of the clan ") + clan + ". Type clan for its commands.\n");
        return p.strName + (leader ? " now leads the " : " is now in the ") + clan + " clan.";
    }

    // A clan name as someone already in it spells it, else as given.
    static String spelling(DuskEngine engine, String clan) {
        for (Player p : Mail.online(engine).values()) if (clan.equalsIgnoreCase(p.strClan)) return p.strClan;
        File[] users = new File("users").listFiles();
        if (users != null) for (File f : users) {
            if (f.getName().contains(".")) continue;
            String c = value(f, "clan");
            if (c != null && clan.equalsIgnoreCase(c) && !none(c)) return c;
        }
        return clan;
    }

    static void tellClan(DuskEngine engine, String clan, String text) {
        if (engine == null) return;
        for (Player p : Mail.online(engine).values()) if (clan.equals(p.strClan)) p.chatMessage(text + "\n");
    }

    // A user file's value: the line after the key's line.
    static String value(File f, String key) {
        try {
            String[] l = new String(Files.readAllBytes(f.toPath()), StandardCharsets.ISO_8859_1).replace("\r", "").split("\n");
            for (int i = 0; i + 1 < l.length; i++) if (l[i].equals(key)) return l[i + 1];
        } catch (Exception e) {
            // unreadable: no value
        }
        return null;
    }

    static String setValue(String text, String key, String v) {
        if (v == null) return text;
        String[] l = text.split("\n", -1);
        for (int i = 0; i + 1 < l.length; i++) {
            if (l[i].replace("\r", "").equals(key)) {
                l[i + 1] = v + (l[i + 1].endsWith("\r") ? "\r" : "");
                return String.join("\n", l);
            }
        }
        return text;
    }
}
