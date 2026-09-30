/*
 * The game engine with two long-standing bugs fixed, overriding just the
 * methods concerned (DuskEngine itself doesn't decompile cleanly enough to
 * rebuild). The patched DuskServer (server/patch.py) creates this instead
 * of a plain DuskEngine.
 *
 * 1. addEntity: the message announcing something new on the map was built
 *    once and appended to for every player who could see it, so the second
 *    player got the first player's copy plus their own without its opcode
 *    byte, and every client after that lost its place in the stream
 *    (garbled "Unknown opcode" lines, missed updates). Now each player gets
 *    a message of their own. Otherwise the same as DuskEngine.addEntity.
 *
 * 2. killDuskObject: closing a player (or pet) frees its ID for reuse, and
 *    a close can run twice (logging in again while the old connection is
 *    still closing), which freed the ID twice, so two new things were given
 *    the same ID. Now an ID is freed only while its slot still holds the
 *    object being closed: the object removeDuskObject was just called with
 *    on the same thread, as both close paths do right before.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.util.Enumeration;

public class FixedEngine extends DuskEngine {
    // The object this thread last took off the map (see killDuskObject).
    // Static so it's ready while DuskEngine's constructor runs.
    private static final ThreadLocal<DuskObject> closing = new ThreadLocal<DuskObject>();

    public FixedEngine() {
        super();
    }

    // 3. The game loop (moving everyone, mobs, regeneration) runs here;
    //    anything it throws used to kill it for good, freezing the game
    //    until a restart (a walk-on script that teleports onto its own
    //    square recursed until the stack ran out). Now it's logged and the
    //    loop starts again.
    @Override
    public void run() {
        while (true) {
            try {
                super.run();
                return;
            } catch (Throwable t) {
                Log.logError(t instanceof Exception ? (Exception) t : new Exception(t), "The game loop crashed and was restarted", false);
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    return;
                }
            }
        }
    }

    @Override
    void removeDuskObject(DuskObject duskObject) {
        closing.set(duskObject);
        super.removeDuskObject(duskObject);
    }

    @Override
    public void killDuskObject(int n) {
        DuskObject was = closing.get();
        closing.remove();
        DuskObject now = getDuskObject(n);
        if (now == null) return; // already freed: don't free it twice
        if (was != null && was.ID == n && now != was) return; // reused by something else since
        super.killDuskObject(n);
    }

    @Override
    synchronized void addEntity(DuskObject duskObject) {
        Enumeration enumeration = this.vctSockets.elements();
        while (enumeration.hasMoreElements()) {
            Player player = (Player) enumeration.nextElement();
            if (!this.canSeeTo(player, duskObject.intLocX, duskObject.intLocY)) continue;
            boolean canSee;
            if (duskObject instanceof LivingThing && this.scrCanSeeLivingThing != null) {
                synchronized (this.scrCanSeeLivingThing) {
                    this.scrCanSeeLivingThing.varVariables.clearVariables();
                    this.scrCanSeeLivingThing.varVariables.addVariable("seeing", player);
                    this.scrCanSeeLivingThing.varVariables.addVariable("seen", (LivingThing) duskObject);
                    canSee = this.scrCanSeeLivingThing.rewindAndParseScript();
                }
            } else {
                canSee = true;
            }
            if (!canSee || player.vctEntities.contains(duskObject)) continue;
            player.vctEntities.addElement(duskObject);
            // The fix: a fresh message for each player.
            StringBuffer msg = new StringBuffer("\u0004");
            if (duskObject instanceof LivingThing) {
                LivingThing thing = (LivingThing) duskObject;
                if (thing instanceof Player) {
                    if (thing.blnSleep) msg.append("<sleeping>");
                    if (!thing.strClan.equals("none")) msg.append("<").append(thing.strClan).append(">");
                    for (int i = 0; i < thing.vctFlags.size(); ++i) msg.append("<").append(thing.vctFlags.elementAt(i)).append(">");
                    this.addObjectStats(msg, duskObject, 0);
                    msg.append(thing.intStep).append("\n");
                    msg.append(thing.hideName).append("\n");
                    msg.append(thing.attributes.getStat("hp")).append("\n");
                    msg.append(thing.attributes.getStat("maxhp")).append("\n");
                } else if (thing instanceof Mob) {
                    if (thing.blnSleep) msg.append("<sleeping>");
                    for (int i = 0; i < thing.vctFlags.size(); ++i) msg.append("<").append(thing.vctFlags.elementAt(i)).append(">");
                    this.addObjectStats(msg, duskObject, 4);
                    ++((Mob) thing).localPlayers;
                    if (((Mob) thing).localPlayers == 1) this.vctActiveMobs.addElement(thing);
                } else if (thing.isPet()) {
                    if (thing.attributes.getStat("hp") < 0) msg.append("<wounded>");
                    if (thing.blnSleep) msg.append("<sleeping>");
                    for (int i = 0; i < thing.vctFlags.size(); ++i) msg.append("<").append(thing.vctFlags.elementAt(i)).append(">");
                    this.addObjectStats(msg, duskObject, 4);
                }
            } else if (duskObject instanceof Item) {
                this.addObjectStats(msg, duskObject, 1);
            } else if (duskObject instanceof Prop) {
                this.addObjectStats(msg, duskObject, 3);
            } else if (duskObject instanceof Sign) {
                this.addObjectStats(msg, duskObject, 3);
            } else if (duskObject instanceof Merchant) {
                this.addObjectStats(msg, duskObject, 2);
            } else if (duskObject instanceof Door) {
                this.addObjectStats(msg, duskObject, 5);
            }
            player.send(msg.toString());
        }
    }
}
