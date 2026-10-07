/*
 * Duels in the Duelling Ring outside Kingshaven (tools/world/cities/
 * arena.mjs): two players fight until one falls, and nobody loses anything.
 * Kept in memory only.
 *
 *   duel <name>          challenge someone; you both have to be in the ring
 *   duel accept|decline  answer a challenge (it lapses after a minute)
 *   duel                 your record (wins and losses)
 *
 * The client shows "DuelInvite: <from>" with Accept and Decline (js/duel.js).
 *
 * How a duel runs: on accept, both are set face to face in the middle of
 * the ring, a count of three, then the engine's own battle. Players who
 * aren't in a clan can't fight each other (DuskEngine.checkCanBattle and
 * Battle.addToBattle refuse anyone whose clan is "none"), so for the
 * duel's length such a player's clan is CLAN, and set back after (and
 * whoever is found with CLAN outside a duel, say after logging out in the
 * middle of one, is set back to "none").
 * The fight goes on until one of them "dies". conf/onDeath, for anyone with
 * the flag "dueling", sets "duellost" and puts them at the ring's gate with
 * 1 HP instead of sending them home. When both are out of the battle, the
 * one with "duellost" lost (if neither, someone fled: no winner), and both
 * get back exactly the gold, experience and health they had before (the
 * engine takes a sixteenth of a dead player's gold and experience, and
 * hands the winner some).
 *
 * Wins and losses are counted with the achievements (server/Achievements.
 * java, "duelwin" and "duelloss"), shown on profiles, and the achievement
 * kind "duelwins" counts the wins.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Duel {
    // The ring's sand (inside its fence), where the two stand to start, and
    // its gate, where the loser is put (conf/onDeath has the same square).
    static final int X0 = 1509, Y0 = 322, X1 = 1521, Y1 = 334;
    static final int[] SPOT_A = { 1514, 328 }, SPOT_B = { 1515, 328 }, GATE = { 1515, 337 };
    static final String CLAN = "duellists";
    static final long STEP_MS = 250, INVITE_MS = 60000, COUNT_MS = 1000;

    static class Fighter {
        final Player p;
        final long cash;
        final int exp, hp;
        final String clan;
        Fighter(Player p) {
            this.p = p;
            cash = p.cash;
            exp = p.exp;
            hp = p.attributes.getStat("hp");
            clan = p.strClan;
        }
    }

    static class Match {
        final Fighter a, b;
        int count = 3; // the count before the fight; then 0
        long nextCount = System.currentTimeMillis() + COUNT_MS;
        boolean fighting = false;
        Match(Player a, Player b) { this.a = new Fighter(a); this.b = new Fighter(b); }
    }

    static final Map<String, String> invites = new HashMap<String, String>(); // challenged -> challenger
    static final Map<String, Long> invitedAt = new HashMap<String, Long>();
    static final List<Match> matches = new ArrayList<Match>();

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
                        Log.logError(e, "Duel", false);
                    }
                }
            }
        }, "Duel");
        t.setDaemon(true);
        t.start();
    }

    static boolean inRing(LivingThing p) {
        return p.intLocX >= X0 && p.intLocX <= X1 && p.intLocY >= Y0 && p.intLocY <= Y1;
    }

    static Match matchOf(String name) {
        for (Match m : matches) if (m.a.p.strName.equalsIgnoreCase(name) || m.b.p.strName.equalsIgnoreCase(name)) return m;
        return null;
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String lower = line.trim().toLowerCase();
        if (!(lower.equals("duel") || lower.startsWith("duel "))) return null;
        if (!(who instanceof Player)) return null;
        String[] a = line.trim().split(" ", 2);
        String arg = a.length > 1 ? a[1].trim() : "";
        String me = who.strName.toLowerCase();
        Map<String, Player> on = Mail.online(engine);
        synchronized (Duel.class) {
            if (arg.length() == 0) {
                long[] r = Achievements.duels(who.strName);
                return "Your duels: " + r[0] + (r[0] == 1 ? " win, " : " wins, ") + r[1] + (r[1] == 1 ? " loss." : " losses.") + " To fight someone, stand in the Duelling Ring outside Kingshaven with them and type: duel <name>.";
            }
            String verb = arg.toLowerCase();
            if (verb.equals("accept") || verb.equals("decline")) {
                String from = invites.remove(me);
                invitedAt.remove(me);
                if (from == null) return "Nobody has challenged you (or it was too long ago).";
                Player them = on.get(from);
                if (verb.equals("decline")) {
                    if (them != null) them.chatMessage(who.strName + " turned down your challenge.\n");
                    return "You turned it down.";
                }
                if (them == null) return "They've left the game.";
                String why = cannot((Player) who, them);
                if (why != null) return why;
                Match m = new Match(them, (Player) who);
                matches.add(m);
                for (Fighter f : new Fighter[] { m.a, m.b }) {
                    f.p.removeCondition("safe"); // the grace after dying (conf/canAttack): they chose to fight
                    Condition c = engine.getCondition("dueling");
                    if (c != null) f.p.addCondition(c);
                    if (f.p.strClan == null || f.p.strClan.equalsIgnoreCase("none")) f.p.strClan = CLAN;
                }
                m.a.p.changeLocBypass(SPOT_A[0], SPOT_A[1]);
                m.b.p.changeLocBypass(SPOT_B[0], SPOT_B[1]);
                engine.chatMessage(them.strName + " and " + who.strName + " step up to fight in the Duelling Ring!", SPOT_A[0], SPOT_A[1]);
                both(m, "The duel begins in 3...");
                return "You accept the challenge.";
            }
            // A challenge.
            Player p = null;
            for (Player q : on.values()) if (q.strName.equalsIgnoreCase(arg)) p = q;
            if (p == null) return "There's nobody called " + arg + " in the game.";
            if (p == who) return "You can't fight yourself.";
            String why = cannot((Player) who, p);
            if (why != null) return why;
            invites.put(p.strName.toLowerCase(), me);
            invitedAt.put(p.strName.toLowerCase(), System.currentTimeMillis());
            p.chatMessage("DuelInvite: " + who.strName + "\n");
            p.chatMessage(who.strName + " challenges you to a duel (duel accept, or duel decline). Nobody loses anything.\n");
            return "You challenge " + p.strName + " to a duel.";
        }
    }

    // Why these two can't duel now, or null.
    static String cannot(Player me, Player them) {
        if (!inRing(me)) return "Duels are fought in the Duelling Ring, outside Kingshaven's east gate. Stand in it first.";
        if (!inRing(them)) return them.strName + " isn't in the Duelling Ring.";
        if (matchOf(me.strName) != null) return "You're in a duel already.";
        if (matchOf(them.strName) != null) return them.strName + " is in a duel already.";
        if (me.batBattle != null) return "Not while you're fighting.";
        if (them.batBattle != null) return them.strName + " is fighting already.";
        if (me.attributes.getStat("hp") < 1 || them.attributes.getStat("hp") < 1) return "Rest up first.";
        return null;
    }

    static void both(Match m, String text) {
        m.a.p.chatMessage(text + "\n");
        m.b.p.chatMessage(text + "\n");
    }

    static void tick(DuskEngine engine) {
        Map<String, Player> on = Mail.online(engine);
        synchronized (Duel.class) {
            long now = System.currentTimeMillis();
            for (String k : new ArrayList<String>(invitedAt.keySet())) {
                if (now - invitedAt.get(k) > INVITE_MS) { invitedAt.remove(k); invites.remove(k); }
            }
            for (Match m : new ArrayList<Match>(matches)) {
                boolean gone = on.get(m.a.p.strName.toLowerCase()) != m.a.p || on.get(m.b.p.strName.toLowerCase()) != m.b.p;
                if (gone) { finish(engine, m, null, "The duel is off: someone left the game."); continue; }
                if (!m.fighting) {
                    if (now < m.nextCount) continue;
                    m.count--;
                    m.nextCount = now + COUNT_MS;
                    if (m.count > 0) { both(m, m.count + "..."); continue; }
                    both(m, "Fight!");
                    m.fighting = true;
                    engine.initiateBattle(m.a.p, m.b.p, 0);
                    if (m.a.p.batBattle == null) finish(engine, m, null, "The duel couldn't start.");
                    continue;
                }
                if (m.a.p.batBattle != null || m.b.p.batBattle != null) continue;
                boolean aLost = m.a.p.hasCondition("duellost"), bLost = m.b.p.hasCondition("duellost");
                Fighter winner = aLost && !bLost ? m.b : bLost && !aLost ? m.a : null;
                finish(engine, m, winner, winner == null ? "The duel ends without a winner." : null);
            }
            // Anyone left with the duel clan outside a duel (logged out in
            // the middle of one): back to none.
            for (Player p : on.values()) {
                if (CLAN.equals(p.strClan) && matchOf(p.strName) == null) p.strClan = "none";
            }
        }
    }

    // Ends a duel: everything back as it was, the result told and counted.
    static void finish(DuskEngine engine, Match m, Fighter winner, String why) {
        matches.remove(m);
        for (Fighter f : new Fighter[] { m.a, m.b }) {
            f.p.cash = f.cash;
            f.p.exp = f.exp;
            f.p.attributes.setStat("hp", Math.max(1, f.hp));
            f.p.strClan = f.clan;
            f.p.removeCondition("dueling");
            f.p.removeCondition("duellost");
            try { f.p.updateInfo(); f.p.updateStats(); } catch (Exception e) {}
        }
        if (winner == null) {
            both(m, why);
            return;
        }
        Fighter loser = winner == m.a ? m.b : m.a;
        engine.chatMessage(winner.p.strName + " has defeated " + loser.p.strName + " in the Duelling Ring!");
        both(m, "Your gold, experience and health are as they were before the duel.");
        Achievements.duel(winner.p, loser.p);
    }
}
