/*
 * Fixes to the engine's fights, called from the compiled Battle as patched
 * by BattlePatch.java (and from Quests.splitExp1/2):
 *
 * - Rewards go only to those still standing. Both sides strike before the
 *   dead are counted, so a player killed in the same round as the creature
 *   was paid its gold, experience and drop as they died. Now the fallen
 *   are left out of the split (and of quest kills and world boss rewards).
 * - "You have won the battle." only when someone was killed. A fight also
 *   ends when the other side flees (the creature AI makes them), and that
 *   said "won" too; now it says the foe fled.
 * - What you lose when you die or flee is what the message says. The
 *   message rounded the loss down while the purse was rounded the other
 *   way ("You have lost 0gp" took 1).
 * - A creature that started the fight dropped nothing when killed: the
 *   drop checked the attacking side's front (the creature) for a player.
 * - A creature that stepped during a fight fled from it. Out of a ranged
 *   weapon's reach, a creature walks toward its foe; after any step
 *   LivingThing.moveTo has the mover flee unless its list of what it sees
 *   holds a foe, and only players keep that list. So every ranged shot
 *   ended the fight after one round ("Your foe has fled"). Now a creature
 *   sees a player when the player sees it (LivingThingPatch: sees).
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Vector;
import java.util.WeakHashMap;

public class BattleFix {
    // Whether a fighter who just moved still sees a foe (in place of
    // self.vctEntities.contains(other) in LivingThing.moveTo).
    public static boolean sees(LivingThing self, Object other) {
        if (self instanceof Player) return self.vctEntities.contains(other);
        if (other instanceof Player) return ((Player) other).vctEntities.contains(self);
        return true;
    }

    // Fights where someone has been killed (for the closing line).
    private static final Map<Battle, Boolean> KILLS = Collections.synchronizedMap(new WeakHashMap<Battle, Boolean>());

    static boolean standing(Object o) {
        if (!(o instanceof LivingThing)) return false;
        LivingThing t = (LivingThing) o;
        return t.blnWorking && t.attributes.getStat("hp") >= 1;
    }

    // Who of a side is still standing.
    static Vector standingOf(Vector side) {
        Vector out = new Vector();
        if (side == null) return out;
        synchronized (side) {
            for (Object o : side) if (standing(o)) out.add(o);
        }
        return out;
    }

    // In place of "front instanceof Player" before a creature's drop.
    public static boolean livingPlayer(Object o) {
        return o instanceof Player && standing(o);
    }

    static void markKill(Battle b) {
        KILLS.put(b, Boolean.TRUE);
    }

    // The closing line, in place of "\tYou have won the battle.\n".
    public static String wonText(Battle b) {
        return KILLS.remove(b) != null ? "\tYou have won the battle.\n" : "\tYour foe has fled. The battle is over.\n";
    }

    // In place of "have - have * mod" for gold and experience lost: the
    // loss rounded down, as the message shows it.
    public static double lose(double have, double loss) {
        return have - Math.floor(loss);
    }

    // Battle's own splits, with the fallen out of the side meanwhile.
    public static void splitMoney1(Battle b, int money) {
        Vector side = b.vctSide1;
        synchronized (side) {
            List<Object> all = new ArrayList<Object>(side);
            side.retainAll(standingOf(side));
            try {
                b.splitMoney1(money);
            } finally {
                side.clear();
                side.addAll(all);
            }
        }
    }

    public static void splitMoney2(Battle b, int money) {
        Vector side = b.vctSide2;
        synchronized (side) {
            List<Object> all = new ArrayList<Object>(side);
            side.retainAll(standingOf(side));
            try {
                b.splitMoney2(money);
            } finally {
                side.clear();
                side.addAll(all);
            }
        }
    }

    static void splitExp(Battle b, LivingThing killed, boolean first) {
        markKill(b);
        Vector side = first ? b.vctSide1 : b.vctSide2;
        synchronized (side) {
            List<Object> all = new ArrayList<Object>(side);
            side.retainAll(standingOf(side));
            try {
                if (first) b.splitExp1(killed);
                else b.splitExp2(killed);
            } finally {
                side.clear();
                side.addAll(all);
            }
        }
    }
}
