/*
 * Parties: a few players who hunt together. Kept in memory only (a restart,
 * or leaving the game, takes you out).
 *
 *   party                    who's in your party
 *   party invite <name>      ask someone in the game to join (you lead a
 *                            new party if you're in none)
 *   party accept | decline   answer an invitation
 *   party leave              leave (the next in line leads)
 *   party kick <name>        (the leader) put someone out
 *   party say <text>         to everyone in it ("PartyChat: <from>|<text>")
 *
 * Kills on a quest's kill step count for the whole party: Quests.killed
 * also credits the winners' party members who are in the game and within
 * NEAR squares of where the creature fell, though they fought something
 * else (server/Quests.java).
 *
 * The client keeps a party frame (js/party.js) from "Party: <leader>|
 * <name>:<hp>:<maxhp>:<x>:<y>,..." sent to every member when it changes
 * and every few seconds ("Party: none" when you leave), and shows
 * "PartyInvite: <from>" with Accept and Decline.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Party {
    static final int MAX = 6, NEAR = 20;
    static final long STEP_MS = 3000, INVITE_MS = 120000;

    static class Group {
        final List<String> members = new ArrayList<String>(); // lower case, the leader first
    }

    static final Map<String, Group> groups = new HashMap<String, Group>(); // member -> their party
    static final Map<String, String> invites = new HashMap<String, String>(); // invited -> who asked
    static final Map<String, Long> invitedAt = new HashMap<String, Long>();

    public static void start(final DuskEngine engine) {
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try {
                        Thread.sleep(STEP_MS);
                        tick(engine);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Party", false);
                    }
                }
            }
        }, "Party");
        t.setDaemon(true);
        t.start();
    }

    // Takes out whoever left the game, and tells everyone how the others are.
    static void tick(DuskEngine engine) {
        Map<String, Player> on = Mail.online(engine);
        List<Group> all;
        synchronized (Party.class) {
            for (String m : new ArrayList<String>(groups.keySet())) if (!on.containsKey(m)) leave(m, on, " left the game");
            long now = System.currentTimeMillis();
            for (String k : new ArrayList<String>(invitedAt.keySet())) if (now - invitedAt.get(k) > INVITE_MS) { invites.remove(k); invitedAt.remove(k); }
            all = new ArrayList<Group>(new java.util.HashSet<Group>(groups.values()));
        }
        for (Group g : all) status(g, on);
    }

    static Player named(Map<String, Player> on, String name) {
        return on.get(name.toLowerCase());
    }

    static void tell(Group g, Map<String, Player> on, String text) {
        for (String m : g.members) {
            Player p = on.get(m);
            if (p != null) p.chatMessage(text + "\n");
        }
    }

    static void status(Group g, Map<String, Player> on) {
        StringBuilder b = new StringBuilder("Party: ");
        List<String> members;
        synchronized (Party.class) {
            members = new ArrayList<String>(g.members);
        }
        if (members.isEmpty()) return;
        Player lead = on.get(members.get(0));
        b.append(lead != null ? lead.strName : members.get(0)).append('|');
        boolean first = true;
        for (String m : members) {
            Player p = on.get(m);
            if (p == null) continue;
            if (!first) b.append(',');
            first = false;
            b.append(p.strName).append(':').append(p.attributes.getStat("hp")).append(':').append(p.attributes.getStat("maxhp") + p.attributes.getStat(2, "hpbon"))
                .append(':').append(p.intLocX).append(':').append(p.intLocY);
        }
        tell(g, on, b.toString());
    }

    // Takes `m` out of their party; the party ends when one is left.
    static void leave(String m, Map<String, Player> on, String why) {
        Group g = groups.remove(m);
        if (g == null) return;
        g.members.remove(m);
        Player gone = on.get(m);
        if (gone != null) gone.chatMessage("Party: none\n");
        if (g.members.size() <= 1) {
            for (String o : g.members) {
                groups.remove(o);
                Player p = on.get(o);
                if (p != null) { p.chatMessage("Party: none\n"); p.chatMessage("Your party has broken up.\n"); }
            }
            g.members.clear();
            return;
        }
        tell(g, on, (gone != null ? gone.strName : m) + why + ".");
        status(g, on);
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String lower = line.trim().toLowerCase();
        if (!(lower.equals("party") || lower.startsWith("party "))) return null;
        if (!(who instanceof Player)) return null;
        String[] a = line.trim().split(" ", 3);
        String verb = a.length > 1 ? a[1].toLowerCase() : "";
        String me = who.strName.toLowerCase();
        Map<String, Player> on = Mail.online(engine);
        synchronized (Party.class) {
            Group mine = groups.get(me);
            if (verb.length() == 0) {
                if (mine == null) return "You're not in a party. Invite someone: party invite <name>.";
                List<String> names = new ArrayList<String>();
                for (String m : mine.members) { Player p = on.get(m); names.add((p != null ? p.strName : m) + (m.equals(mine.members.get(0)) ? " (leads)" : "")); }
                status(mine, on);
                return "Your party: " + String.join(", ", names) + ".";
            }
            if (verb.equals("invite")) {
                if (a.length < 3) return "Usage: party invite <name>";
                Player p = named(on, a[2].trim());
                if (p == null) return "There's nobody called " + a[2].trim() + " in the game.";
                String them = p.strName.toLowerCase();
                if (them.equals(me)) return "You can't invite yourself.";
                if (groups.containsKey(them)) return p.strName + " is in a party already.";
                if (mine != null && !mine.members.get(0).equals(me)) return "Only the party's leader can invite.";
                if (mine != null && mine.members.size() >= MAX) return "Your party is full (" + MAX + ").";
                invites.put(them, me);
                invitedAt.put(them, System.currentTimeMillis());
                p.chatMessage("PartyInvite: " + who.strName + "\n");
                p.chatMessage(who.strName + " asks you to join their party (party accept, or party decline).\n");
                return "You asked " + p.strName + " to join your party.";
            }
            if (verb.equals("accept") || verb.equals("decline")) {
                String from = invites.remove(me);
                invitedAt.remove(me);
                if (from == null) return "Nobody has asked you to join a party (or it was too long ago).";
                Player lead = on.get(from);
                if (verb.equals("decline")) {
                    if (lead != null) lead.chatMessage(who.strName + " said no to joining your party.\n");
                    return "You said no.";
                }
                if (lead == null) return "They've left the game.";
                if (groups.containsKey(me)) return "Leave your party first.";
                Group g = groups.get(from);
                if (g == null) { g = new Group(); g.members.add(from); groups.put(from, g); }
                else if (!g.members.get(0).equals(from)) return "They don't lead their party any more.";
                if (g.members.size() >= MAX) return "That party is full.";
                g.members.add(me);
                groups.put(me, g);
                tell(g, on, who.strName + " has joined the party.");
                status(g, on);
                return "";
            }
            if (verb.equals("leave")) {
                if (mine == null) return "You're not in a party.";
                leave(me, on, " has left the party");
                return "You left the party.";
            }
            if (verb.equals("kick")) {
                if (mine == null || !mine.members.get(0).equals(me)) return "Only the party's leader can do that.";
                if (a.length < 3) return "Usage: party kick <name>";
                String them = a[2].trim().toLowerCase();
                if (!mine.members.contains(them) || them.equals(me)) return "They're not in your party.";
                Player p = on.get(them);
                if (p != null) p.chatMessage("You've been put out of the party.\n");
                leave(them, on, " was put out of the party");
                return "";
            }
            if (verb.equals("say")) {
                if (mine == null) return "You're not in a party.";
                String text = a.length > 2 ? a[2].trim() : "";
                if (text.length() == 0) return "";
                if (text.length() > 300) text = text.substring(0, 300);
                tell(mine, on, "PartyChat: " + who.strName + "|" + text.replace('\n', ' '));
                return "";
            }
        }
        return "Usage: party | party invite <name> | accept | decline | leave | kick <name> | say <text>";
    }

    // Everyone to credit for a kill by `winners`: them, and their party
    // members in the game within NEAR of x,y (once each).
    static List<Player> withParty(List<Player> winners, DuskEngine engine, int x, int y) {
        List<Player> out = new ArrayList<Player>(winners);
        Map<String, Player> on = null;
        synchronized (Party.class) {
            for (Player w : winners) {
                Group g = groups.get(w.strName.toLowerCase());
                if (g == null) continue;
                if (on == null) on = Mail.online(engine);
                for (String m : g.members) {
                    Player p = on.get(m);
                    if (p == null || out.contains(p)) continue;
                    if (Math.abs(p.intLocX - x) <= NEAR && Math.abs(p.intLocY - y) <= NEAR) out.add(p);
                }
            }
        }
        return out;
    }
}
