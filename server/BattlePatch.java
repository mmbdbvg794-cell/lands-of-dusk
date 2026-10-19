/*
 * Kills count for quests.
 *
 * When something dies in a fight, Battle shares its experience out to the
 * winning side with this.splitExp1(killed) or this.splitExp2(killed). This
 * sends those calls through Quests.splitExp1(this, killed) and
 * Quests.splitExp2(this, killed) instead, which share the experience just
 * the same and then count the kill for anyone on a quest's kill step
 * (server/Quests.java). The stack is the same before and after (the
 * battle, then what was killed), so nothing else in the method changes.
 *
 * And the fixes in server/BattleFix.java, each a like-for-like swap on
 * the stack: splitMoney1/2(int) go through BattleFix (only those still
 * standing are paid); "have - have * gplosemod" (and explosemod, and the
 * flee mods) loses BattleFix.lose, the amount the message shows; the
 * creature drop's "thnFront1 instanceof Player" is BattleFix.livingPlayer,
 * and in the second (a creature of the attacking side killed) it checks
 * thnFront2, who gets the drop; endBattle's "You have won the battle."
 * comes from BattleFix.wonText(this).
 *
 *   java --add-exports ... BattlePatch <Battle.class in> <Battle.class out>
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.nio.file.Files;
import java.nio.file.Paths;
import jdk.internal.org.objectweb.asm.ClassReader;
import jdk.internal.org.objectweb.asm.ClassWriter;
import jdk.internal.org.objectweb.asm.Opcodes;
import jdk.internal.org.objectweb.asm.tree.AbstractInsnNode;
import jdk.internal.org.objectweb.asm.tree.ClassNode;
import jdk.internal.org.objectweb.asm.tree.FieldInsnNode;
import jdk.internal.org.objectweb.asm.tree.InsnList;
import jdk.internal.org.objectweb.asm.tree.InsnNode;
import jdk.internal.org.objectweb.asm.tree.LdcInsnNode;
import jdk.internal.org.objectweb.asm.tree.TypeInsnNode;
import jdk.internal.org.objectweb.asm.tree.VarInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodNode;

public class BattlePatch {
    public static void main(String[] args) throws Exception {
        ClassNode cls = new ClassNode();
        new ClassReader(Files.readAllBytes(Paths.get(args[0]))).accept(cls, 0);
        int n = 0;
        for (MethodNode m : cls.methods) {
            java.util.List<MethodInsnNode> calls = new java.util.ArrayList<MethodInsnNode>();
            for (AbstractInsnNode i : m.instructions.toArray()) {
                if (!(i instanceof MethodInsnNode)) continue;
                MethodInsnNode call = (MethodInsnNode) i;
                if (call.owner.equals("Quests")) throw new Exception("already patched; not patching again");
                if (call.getOpcode() == Opcodes.INVOKEVIRTUAL && call.owner.equals("Battle")
                    && (call.name.equals("splitExp1") || call.name.equals("splitExp2")) && call.desc.equals("(LLivingThing;)V")) calls.add(call);
            }
            for (MethodInsnNode call : calls) {
                m.instructions.set(call, new MethodInsnNode(Opcodes.INVOKESTATIC, "Quests", call.name, "(LBattle;LLivingThing;)V", false));
                n++;
            }
        }
        if (n == 0) throw new Exception("no splitExp1/splitExp2(LivingThing) calls in " + args[0]);

        int money = 0, losses = 0, drops = 0, won = 0;
        java.util.Set<String> mods = new java.util.HashSet<String>(java.util.Arrays.asList("gplosemod", "explosemod", "gpfleemod", "expfleemod"));
        for (MethodNode m : cls.methods) {
            boolean split = m.name.startsWith("splitMoney");
            int front = 0;
            for (AbstractInsnNode i : m.instructions.toArray()) {
                if (!split && i instanceof MethodInsnNode) {
                    MethodInsnNode call = (MethodInsnNode) i;
                    if (call.getOpcode() == Opcodes.INVOKEVIRTUAL && call.owner.equals("Battle") && call.desc.equals("(I)V")
                        && (call.name.equals("splitMoney1") || call.name.equals("splitMoney2"))) {
                        m.instructions.set(call, new MethodInsnNode(Opcodes.INVOKESTATIC, "BattleFix", call.name, "(LBattle;I)V", false));
                        money++;
                    }
                }
                // getfield <mod>; dmul; dsub
                if (i.getOpcode() == Opcodes.DSUB && i.getPrevious() != null && i.getPrevious().getOpcode() == Opcodes.DMUL
                    && i.getPrevious().getPrevious() instanceof FieldInsnNode && mods.contains(((FieldInsnNode) i.getPrevious().getPrevious()).name)) {
                    m.instructions.set(i, new MethodInsnNode(Opcodes.INVOKESTATIC, "BattleFix", "lose", "(DD)D", false));
                    losses++;
                }
                // getfield thnFront1; instanceof Player
                if (m.name.equals("run") && i.getOpcode() == Opcodes.INSTANCEOF && ((TypeInsnNode) i).desc.equals("Player")
                    && i.getPrevious() instanceof FieldInsnNode && ((FieldInsnNode) i.getPrevious()).name.equals("thnFront1")) {
                    front++;
                    if (front == 2) ((FieldInsnNode) i.getPrevious()).name = "thnFront2";
                    m.instructions.set(i, new MethodInsnNode(Opcodes.INVOKESTATIC, "BattleFix", "livingPlayer", "(Ljava/lang/Object;)Z", false));
                    drops++;
                }
                if (m.name.equals("endBattle") && i instanceof LdcInsnNode && "\tYou have won the battle.\n".equals(((LdcInsnNode) i).cst)) {
                    InsnList with = new InsnList();
                    with.add(new VarInsnNode(Opcodes.ALOAD, 0));
                    with.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "BattleFix", "wonText", "(LBattle;)Ljava/lang/String;", false));
                    m.instructions.insertBefore(i, with);
                    m.instructions.remove(i);
                    won++;
                }
            }
        }
        // As in the decompiled Battle: 8 gold splits (run 4, flee 4), 12
        // losses (gold and exp: 4 deaths in run, 2 flees), 2 drops, 1 line.
        if (losses != 12 || drops != 2 || won != 1 || money != 8)
            throw new Exception("unexpected Battle: " + losses + " losses, " + drops + " drops, " + won + " won lines, " + money + " gold splits");
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched " + n + " kills to count for quests, " + money + " gold splits, " + losses + " losses, " + drops + " drops, the won line in " + args[1]);
    }
}
