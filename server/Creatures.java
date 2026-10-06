/*
 * Creatures that think: the game's own creature behaviour (Faction.runAI),
 * which nothing in this server ever called, so creatures only moved in a
 * fight. Ported here (think) with two fixes: packs now count each other,
 * and a creature can start a fight with a player outside a clan (attack;
 * the engine's own check refused those, meaning player against player).
 * Every THINK_MS each creature a player can see gets a turn:
 *
 *   - an enemy in sight (within 4 squares) it thinks it can beat: it walks
 *     up and attacks;
 *   - one much stronger: it backs away; in between it stands its ground;
 *   - nobody: now and then (1 turn in 25) a step in a random direction.
 *
 * Who's an enemy is its faction's grudge (factions/<name>, saved by the
 * game): killing a faction's creatures makes it dislike you, and some
 * factions dislike other creatures. Creatures with no faction (training
 * dummies, rubble, Townfolk) stay put, as the game has it.
 *
 * Added here: a leash. A creature more than LEASH squares from where it was
 * placed stops what it's doing and walks home (to within LEASH / 2), so
 * none wander off into towns or follow someone across the map. Pets,
 * creatures in a fight and ones a script is moving are left alone.
 *
 * "ai off" in conf/prefs turns it all off. conf/creatures-debug (an empty
 * file) logs what creatures near players make of them.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.util.Map;
import java.util.WeakHashMap;

public class Creatures {
    static final long THINK_MS = 600;
    static final int LEASH = 8;

    // Where each creature was placed (seen at start, or when first met).
    static final Map<Mob, int[]> home = new WeakHashMap<Mob, int[]>();
    // Creatures on their way home.
    static final Map<Mob, Boolean> returning = new WeakHashMap<Mob, Boolean>();
    static boolean debugOn;

    public static void start(final DuskEngine engine) {
        Thread t = new Thread(new Runnable() {
            public void run() {
                try {
                    Thread.sleep(5000); // the world loaded
                } catch (InterruptedException e) {
                    return;
                }
                for (Object o : engine.vctMobs.toArray()) home((Mob) o);
                Log.logEvent("Creatures: " + home.size() + " placed; thinking every " + THINK_MS + " ms, leash " + LEASH);
                while (true) {
                    try {
                        Thread.sleep(THINK_MS);
                        tick(engine);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Creatures tick", false);
                    }
                }
            }
        }, "Creatures");
        t.setDaemon(true);
        t.start();
    }

    static synchronized int[] home(Mob m) {
        int[] h = home.get(m);
        if (h == null) { h = new int[] { m.intLocX, m.intLocY }; home.put(m, h); }
        return h;
    }

    static void tick(DuskEngine engine) {
        if (!engine.blnAI) return;
        boolean debug = debugOn = new java.io.File("conf/creatures-debug").exists();
        for (Object o : engine.vctActiveMobs.toArray()) {
            Mob m = (Mob) o;
            if (m.fctFaction == null || m.isPet() || m.thnMaster != null || m.batBattle != null) continue;
            if (m.vctMovement.size() > 0) continue; // a script is moving it
            if (m.attributes.getStat("hp") <= 0) continue;
            int[] h = home(m);
            int far = Math.max(Math.abs(m.intLocX - h[0]), Math.abs(m.intLocY - h[1]));
            boolean back = returning.containsKey(m);
            if (back && far <= LEASH / 2) { returning.remove(m); back = false; }
            if (!back && far > LEASH) { returning.put(m, Boolean.TRUE); back = true; }
            if (back) {
                stepToward(m, h[0], h[1]);
                continue;
            }
            if (debug) explain(engine, m);
            think(engine, m);
        }
    }

    // The game's Faction.runAI, with one fix: it read what's in range from a
    // table that keeps same-named things together as one list, and skipped
    // the lists, so a pack never saw itself (each wolf thought it was alone
    // and ran from anyone it disliked). Otherwise the same rules and sums.
    static void think(DuskEngine engine, Mob m) {
        Faction f = m.fctFaction;
        int confidence = 0;
        LivingThing enemy = null;
        double enemyLevel = 0.0;
        DuskTable near = engine.getObjectsWithinRange(m, 4, true);
        if (near == null) return;
        for (Object o : near.convertToVector()) {
            if (!(o instanceof LivingThing)) continue;
            LivingThing t = (LivingThing) o;
            if (!canSee(engine, m, t) || !engine.canSeeTo(m, t.intLocX, t.intLocY)) continue;
            double level;
            if (t instanceof Player) {
                level = f.getRelationValue(t.strName);
                if (t.strClan != null && !t.strClan.equals("none")) level = (level + f.getRelationValue(t.strClan)) / 2.0;
                if (level < 0.0 && (enemy == null || enemyLevel < level)) { enemy = t; enemyLevel = level; }
                confidence = (int) (confidence + level * t.getTotalPoints());
            }
            if (!(t instanceof Mob)) continue;
            Mob other = (Mob) t;
            level = other.strName.equals(m.strName) ? other.dblGroupRelation : f.getRelationValue(other.strName);
            confidence = (int) (confidence + level * other.getTotalPoints());
            if (level < 0.0 && (enemy == null || enemyLevel > level)) { enemy = other; enemyLevel = level; }
            confidence = (int) (confidence + level * t.getTotalPoints());
        }
        if (enemy != null) {
            double delta = (m.getTotalPoints() + confidence) * m.dblBravery * -1.0 * enemyLevel;
            int theirs = enemy.getTotalPoints();
            int x = enemy.intLocX - m.intLocX, y = enemy.intLocY - m.intLocY;
            if (debugOn) Log.logEvent("Creatures debug: " + m.strName + " " + m.ID + " vs " + enemy.strName + ": theirs " + theirs + ", delta " + (int) delta + " (confidence " + confidence + ")");
            if (theirs < delta) {
                if (theirs > delta - delta * 0.1 * Math.random()) return; // sizing them up
                // (By ID: this server's "a" takes one, not a name as the old AI's did.)
                if (Math.abs(x) + Math.abs(y) <= m.getRange()) { attack(engine, m, enemy); return; }
                if (Math.abs(x) > Math.abs(y)) step(m, x < 0 ? 'w' : 'e');
                else step(m, y < 0 ? 'n' : 's');
                return;
            }
            if (theirs < delta + delta * 0.1 * Math.random()) return; // standing its ground
            // Too strong: away.
            if (Math.abs(x) < Math.abs(y)) step(m, x < 0 ? 'e' : 'w');
            else step(m, y < 0 ? 's' : 'n');
            return;
        }
        if ((int) (Math.random() * 25.0) != 1) return;
        step(m, Math.random() < 0.5 ? (Math.random() < 0.5 ? 'e' : 'w') : (Math.random() < 0.5 ? 's' : 'n'));
    }

    // Starts a fight (or joins the one they're in), as the engine's
    // initiateBattle does, but not by its checkCanBattle: that refuses any
    // fight with a player outside a clan (meant for player against player),
    // which is nearly everyone, so a creature could never start one. Kept:
    // the canAttack script (conf/canAttack: no one "safe"), no pets, no one
    // at a shop, next to them.
    static void attack(DuskEngine engine, Mob m, LivingThing enemy) {
        if (enemy.isPet() || m.batBattle != null) return;
        if (Math.abs(m.intLocX - enemy.intLocX) + Math.abs(m.intLocY - enemy.intLocY) > 1) return;
        if (enemy instanceof Player && engine.overMerchant(enemy.intLocX, enemy.intLocY) != null) return;
        Script ca = engine.scrCanAttack;
        if (ca != null) synchronized (ca) {
            ca.varVariables.clearVariables();
            ca.varVariables.addVariable("attacking", m);
            ca.varVariables.addVariable("attacked", enemy);
            if (!ca.rewindAndParseScript()) return;
        }
        if (debugOn) Log.logEvent("Creatures debug: " + m.strName + " " + m.ID + " attacks " + enemy.strName);
        synchronized (engine.vctBattles) {
            if (enemy.batBattle == null) {
                engine.vctBattles.addElement(new Battle(m, enemy, engine));
            } else {
                enemy.batBattle.addToBattle(m, enemy.bytSide == 1 ? 2 : 1);
                enemy.batBattle.chatMessage("\t" + m.strName + " has joined the battle.\n");
            }
        }
    }

    // The game's "can this one see that one" script (conf/canSeeLivingThing:
    // invisibility), if it has one.
    static boolean canSee(DuskEngine engine, Mob m, LivingThing t) {
        Script sc = engine.scrCanSeeLivingThing;
        if (sc == null) return true;
        synchronized (sc) {
            sc.varVariables.clearVariables();
            sc.varVariables.addVariable("seeing", m);
            sc.varVariables.addVariable("seen", t);
            return sc.rewindAndParseScript();
        }
    }

    // With conf/creatures-debug present: what each creature near a player
    // makes of them, in the log (a line a creature every few seconds).
    static final Map<Mob, Long> said = new WeakHashMap<Mob, Long>();
    static void explain(DuskEngine engine, Mob m) {
        long now = System.currentTimeMillis();
        Long last = said.get(m);
        if (last != null && now - last < 5000) return;
        for (Object o : engine.vctSockets.toArray()) {
            LivingThing p = (LivingThing) o;
            int d = Math.abs(p.intLocX - m.intLocX) + Math.abs(p.intLocY - m.intLocY);
            if (d > 4) continue;
            said.put(m, now);
            Log.logEvent("Creatures debug: " + m.strName + " at " + m.intLocX + "," + m.intLocY + " (faction " + m.fctFaction.strName
                + ", bravery " + m.dblBravery + ", points " + m.getTotalPoints() + ", range " + m.getRange() + ") sees " + p.strName
                + " " + d + " away: relation " + m.fctFaction.getRelationValue(p.strName) + ", points " + p.getTotalPoints()
                + ", can see " + engine.canSeeTo(m, p.intLocX, p.intLocY) + ", sight script " + canSee(engine, m, p));
        }
    }

    // One step home, the longer way first (the other if that's blocked).
    static void stepToward(Mob m, int x, int y) {
        int dx = x - m.intLocX, dy = y - m.intLocY;
        int was = m.intLocX * 100000 + m.intLocY;
        if (Math.abs(dx) >= Math.abs(dy)) {
            if (dx != 0) step(m, dx > 0 ? 'e' : 'w');
            if (m.intLocX * 100000 + m.intLocY == was && dy != 0) step(m, dy > 0 ? 's' : 'n');
        } else {
            step(m, dy > 0 ? 's' : 'n');
            if (m.intLocX * 100000 + m.intLocY == was && dx != 0) step(m, dx > 0 ? 'e' : 'w');
        }
    }

    static void step(Mob m, char d) {
        if (d == 'n') m.moveN();
        else if (d == 's') m.moveS();
        else if (d == 'w') m.moveW();
        else m.moveE();
    }
}
