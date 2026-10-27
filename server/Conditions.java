/*
 * Conditions that wear off, and ones that do something every so often.
 *
 * This server's engine keeps conditions (curse, armor, invisibility, the
 * safety after dying, no hunger after eating...) with a duration and an
 * "occurance", but nothing ever counted them: a player's saved conditions
 * all show 0 ticks past, so a timed condition lasted for ever and an
 * "onoccurance" script (regeneration's healing) never ran. The engine's
 * other timers count a tick a second (DuskEngine.run: every fourth pass of
 * 250 ms), so here, once a second, for everything that has conditions
 * (engine.vctCheckConditions): each condition's ticks go up by one; its
 * onoccurance script runs every <occurance> ticks; and when its ticks
 * reach its duration (if it has one) it's removed, which runs its onend
 * script (LivingThing.removeCondition).
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.util.ArrayList;
import java.util.List;

public class Conditions {
    static final long TICK_MS = 1000;

    public static void start(final DuskEngine engine) {
        Thread t = new Thread(new Runnable() {
            public void run() {
                long next = System.currentTimeMillis();
                while (true) {
                    try {
                        next += TICK_MS;
                        long wait = next - System.currentTimeMillis();
                        if (wait > 0) Thread.sleep(wait);
                        else next = System.currentTimeMillis(); // fell behind: don't race to catch up
                        tick(engine);
                    } catch (InterruptedException e) {
                        return;
                    } catch (Exception e) {
                        Log.logError(e, "Condition tick", false);
                    }
                }
            }
        }, "Conditions");
        t.setDaemon(true);
        t.start();
    }

    static void tick(DuskEngine engine) {
        // Someone trying a class who has left the training yard (Classes).
        try {
            Classes.trialTick(engine);
        } catch (Exception e) {
            Log.logError(e, "Class trials", false);
        }
        Object[] things = engine.vctCheckConditions.toArray();
        for (Object o : things) {
            if (!(o instanceof LivingThing)) continue;
            LivingThing who = (LivingThing) o;
            Object[] conds = who.vctConditions.toArray();
            List<String> ended = new ArrayList<String>();
            for (Object c : conds) {
                if (!(c instanceof Condition)) continue;
                Condition cond = (Condition) c;
                cond.intTicksPast++;
                if (cond.strOnOccurance != null && cond.intOccurance > 0 && cond.intTicksPast % cond.intOccurance == 0) run(engine, who, cond.strOnOccurance, cond.strName);
                if (cond.intDuration > 0 && cond.intTicksPast >= cond.intDuration) ended.add(cond.strName);
            }
            for (String name : ended) {
                try {
                    who.removeCondition(name);
                } catch (Exception e) {
                    Log.logError(e, "Ending condition " + name + " on " + who.strName, false);
                }
            }
        }
    }

    static void run(DuskEngine engine, LivingThing who, String script, String cond) {
        try {
            Script s = new Script("scripts/" + script, engine, false);
            s.varVariables.addVariable("trigger", who);
            s.runScript();
            s.close();
        } catch (Exception e) {
            Log.logError(e, "Condition " + cond + "'s script " + script + " on " + who.strName, false);
        }
    }
}
