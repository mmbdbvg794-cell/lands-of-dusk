/*
 * Trading between two players standing near each other: each puts items
 * and gold on the table, both press ready, and the swap happens at once.
 * Any change to either side un-readies both, so nobody is caught out by a
 * last-second switch.
 *
 *   trade <player>       ask them to trade (they get "Trade: request <you>")
 *   trade accept         open the trade you were asked for
 *   trade decline
 *   trade offer <item>   put an item from your pack on the table (its ID)
 *   trade back <item>    take one back (by name)
 *   trade gold <amount>  how much gold you're putting in (0 for none)
 *   trade ready          you're happy with it; when both are, it happens
 *   trade cancel
 *   trade                what's on the table
 *
 * Each change is sent to both as
 *   Trade: with <other>
 *   Trade: mine <gold>|<ready 0/1>|<item>;<item>...
 *   Trade: theirs <gold>|<ready 0/1>|<item>;...
 *   Trade: end
 * and "Trade: closed <why>" or "Trade: done" when it's over. Items that
 * can't be sold (cost 0, like quest items) can't be traded either.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.util.HashMap;
import java.util.Map;
import java.util.Vector;

public class Trade {
    static final int REACH = 3;
    static final long REQUEST_MS = 60000;

    static class Side {
        final String name; // lower case
        final Vector<Item> items = new Vector<Item>();
        long gold = 0;
        boolean ready = false;
        Side(String name) { this.name = name; }
    }

    static class Session {
        final Side a, b;
        Session(String a, String b) { this.a = new Side(a); this.b = new Side(b); }
        Side side(String name) { return a.name.equals(name) ? a : b; }
        Side other(String name) { return a.name.equals(name) ? b : a; }
    }

    private static final Map<String, Session> sessions = new HashMap<String, Session>();
    private static final Map<String, Object[]> requests = new HashMap<String, Object[]>(); // to -> {from, when}

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        String lower = t.toLowerCase();
        if (!(lower.equals("trade") || lower.startsWith("trade "))) return null;
        if (!(who instanceof Player)) return "Only players can trade.";
        try {
            synchronized (Trade.class) {
                return run(who, engine, t.substring(5).trim());
            }
        } catch (Exception e) {
            Log.logError(e, "Trade \"" + t + "\" by " + who.strName, false);
            return "Something went wrong with the trade.";
        }
    }

    private static String run(LivingThing who, DuskEngine engine, String args) throws Exception {
        String me = who.strName.toLowerCase();
        String lower = args.toLowerCase();
        Session s = sessions.get(me);
        // A trade whose other side has gone is over.
        if (s != null) {
            LivingThing other = engine.getPlayer(s.other(me).name);
            if (other == null) {
                close(engine, s, "The other player has left.");
                s = null;
            }
        }
        if (lower.equals("accept")) return accept(who, engine, me);
        if (lower.equals("decline")) {
            Object[] r = requests.remove(me);
            if (r == null) return "Nobody has asked you to trade.";
            LivingThing from = engine.getPlayer((String) r[0]);
            if (from != null) from.chatMessage("Trade: closed " + who.strName + " doesn't want to trade.");
            return "Trade: closed You turned the trade down.";
        }
        if (lower.equals("cancel")) {
            if (s == null) return "You aren't trading.";
            close(engine, s, who.strName + " called the trade off.");
            return "";
        }
        if (s == null) {
            if (lower.length() == 0) return "You aren't trading. Trade with someone: trade <player>.";
            if (lower.matches("offer .*|back .*|gold .*|ready")) return "You aren't trading.";
            return ask(who, engine, me, args);
        }
        LivingThing other = engine.getPlayer(s.other(me).name);
        if (!near(who, other)) {
            close(engine, s, "You're too far apart to trade.");
            return "";
        }
        Side mine = s.side(me);
        if (lower.length() == 0) return state(s, me, null, engine);
        if (lower.startsWith("offer ")) {
            String what = args.substring(6).trim();
            Item item = Storage.isNumber(what) ? who.items.getItem(Integer.parseInt(what)) : who.items.getItem(what, 0);
            if (item == null) return "You don't have that.";
            if (mine.items.contains(item)) return "That's already on the table.";
            if (item.intCost == 0) return "The " + item.strName + " can't be traded.";
            mine.items.add(item);
            return changed(s, me, engine);
        }
        if (lower.startsWith("back ")) {
            String what = args.substring(5).trim();
            for (int i = 0; i < mine.items.size(); i++) {
                if (mine.items.get(i).strName.equalsIgnoreCase(what)) {
                    mine.items.remove(i);
                    return changed(s, me, engine);
                }
            }
            return "That isn't on the table.";
        }
        if (lower.startsWith("gold ")) {
            String n = args.substring(5).trim();
            if (!Storage.isNumber(n) || n.length() > 12) return "How much gold? trade gold <amount>";
            long g = Long.parseLong(n);
            if (g > who.cash) return "You're only carrying " + who.cash + " gp.";
            mine.gold = g;
            return changed(s, me, engine);
        }
        if (lower.equals("ready")) {
            mine.ready = true;
            if (s.a.ready && s.b.ready) return finish(engine, s);
            return state(s, me, null, engine);
        }
        return "Trade: trade <player>, accept, decline, offer <item>, back <item>, gold <amount>, ready, cancel";
    }

    private static boolean near(LivingThing a, LivingThing b) {
        return a != null && b != null && Math.abs(a.intLocX - b.intLocX) <= REACH && Math.abs(a.intLocY - b.intLocY) <= REACH;
    }

    private static String ask(LivingThing who, DuskEngine engine, String me, String name) {
        LivingThing other = engine.getPlayer(name);
        if (!(other instanceof Player) || other == who) return "There's no one called " + name + " here to trade with.";
        if (!near(who, other)) return other.strName + " is too far away to trade with.";
        String them = other.strName.toLowerCase();
        if (sessions.containsKey(them)) return other.strName + " is trading with someone else.";
        // They asked us first: that's agreement.
        Object[] theirs = requests.get(me);
        if (theirs != null && theirs[0].equals(them)) return accept(who, engine, me);
        requests.put(them, new Object[] { me, System.currentTimeMillis() });
        other.chatMessage(who.strName + " wants to trade with you.");
        other.chatMessage("Trade: request " + who.strName);
        return "You ask " + other.strName + " to trade.";
    }

    private static String accept(LivingThing who, DuskEngine engine, String me) {
        Object[] r = requests.remove(me);
        if (r == null || System.currentTimeMillis() - (Long) r[1] > REQUEST_MS) return "Nobody has asked you to trade (or they asked a while ago: ask them again).";
        String from = (String) r[0];
        LivingThing other = engine.getPlayer(from);
        if (other == null) return "They've gone.";
        if (!near(who, other)) return other.strName + " is too far away to trade with.";
        if (sessions.containsKey(from) || sessions.containsKey(me)) return "One of you is already trading.";
        Session s = new Session(from, me);
        sessions.put(from, s);
        sessions.put(me, s);
        return state(s, me, other, engine);
    }

    // Something changed: both un-ready, and both told.
    private static String changed(Session s, String me, DuskEngine engine) {
        s.a.ready = s.b.ready = false;
        return state(s, me, null, engine);
    }

    // Sends the table to the other player and returns it for this one.
    private static String state(Session s, String me, LivingThing other, DuskEngine engine) {
        if (other == null) other = engine.getPlayer(s.other(me).name);
        LivingThing self = engine.getPlayer(me);
        if (other != null) send(other, s, s.other(me).name, self != null ? self.strName : me);
        String[] lines = table(s, me, other != null ? other.strName : s.other(me).name);
        if (self != null) for (int i = 0; i < lines.length - 1; i++) self.chatMessage(lines[i]);
        return lines[lines.length - 1];
    }

    private static void send(LivingThing to, Session s, String name, String otherName) {
        for (String l : table(s, name, otherName)) to.chatMessage(l);
    }

    private static String[] table(Session s, String me, String otherName) {
        return new String[] { "Trade: with " + otherName, "Trade: mine " + side(s.side(me)), "Trade: theirs " + side(s.other(me)), "Trade: end" };
    }

    private static String side(Side x) {
        StringBuffer b = new StringBuffer().append(x.gold).append('|').append(x.ready ? 1 : 0).append('|');
        for (int i = 0; i < x.items.size(); i++) b.append(i > 0 ? ";" : "").append(x.items.get(i).strName.replace(';', ' '));
        return b.toString();
    }

    private static void close(DuskEngine engine, Session s, String why) {
        sessions.remove(s.a.name);
        sessions.remove(s.b.name);
        for (String n : new String[] { s.a.name, s.b.name }) {
            LivingThing p = engine.getPlayer(n);
            if (p != null) p.chatMessage("Trade: closed " + why);
        }
    }

    // Both ready: check everything is still there, then swap.
    private static String finish(DuskEngine engine, Session s) throws Exception {
        LivingThing a = engine.getPlayer(s.a.name), b = engine.getPlayer(s.b.name);
        if (a == null || b == null) { close(engine, s, "The other player has left."); return ""; }
        if (!near(a, b)) { close(engine, s, "You're too far apart to trade."); return ""; }
        for (Item it : s.a.items) if (!a.items.contains(it)) { close(engine, s, a.strName + " no longer has the " + it.strName + "."); return ""; }
        for (Item it : s.b.items) if (!b.items.contains(it)) { close(engine, s, b.strName + " no longer has the " + it.strName + "."); return ""; }
        if (s.a.gold > a.cash || s.b.gold > b.cash) { close(engine, s, "Someone doesn't have the gold they offered any more."); return ""; }
        sessions.remove(s.a.name);
        sessions.remove(s.b.name);
        // Taken from both and saved before anything is given, so a crash in
        // between loses the trade rather than copying it.
        for (Item it : s.a.items) a.items.remove((Object) it);
        for (Item it : s.b.items) b.items.remove((Object) it);
        a.cash -= s.a.gold;
        b.cash -= s.b.gold;
        a.savePlayer();
        b.savePlayer();
        for (Item it : s.a.items) b.items.add((Object) it);
        for (Item it : s.b.items) a.items.add((Object) it);
        a.cash += s.b.gold;
        b.cash += s.a.gold;
        a.savePlayer();
        b.savePlayer();
        for (LivingThing p : new LivingThing[] { a, b }) {
            p.updateItems();
            p.updateStats();
        }
        Log.logEvent("Trade: " + a.strName + " gave " + s.a.items.size() + " items and " + s.a.gold + " gp to " + b.strName + " for " + s.b.items.size() + " items and " + s.b.gold + " gp");
        String with = b.strName;
        b.chatMessage("Trade: done The trade with " + a.strName + " is done.");
        a.chatMessage("Trade: done The trade with " + with + " is done.");
        return "";
    }
}
