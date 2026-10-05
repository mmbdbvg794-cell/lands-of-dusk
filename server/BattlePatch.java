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
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched " + n + " kills to count for quests in " + args[1]);
    }
}
