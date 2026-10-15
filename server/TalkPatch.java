/*
 * An NPC's question doesn't swallow the next command (server/Talk.java).
 *
 * A script's "input" (Script.java, op 48) reads the player's next line
 * straight off the socket, whatever it is, so "buy 1 water" typed while the
 * Quartermaster waits for "(i have them)" became the answer, and was lost
 * ("Hm? Talk to me again when you've made up your mind."). This adds, right
 * after that line is stored, strInput = Talk.answer(player, strInput):
 * when the question offered choices and the line is none of them, Talk
 * runs it as a command. Straight code, no branches, so frames stay as they
 * are.
 *
 *   java --add-exports ... TalkPatch <Script.class in> <Script.class out>
 *
 * Run on the Script that SpellPatch made. Part of the browser client
 * project (dusk-browser-client/server).
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
import jdk.internal.org.objectweb.asm.tree.MethodInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodNode;
import jdk.internal.org.objectweb.asm.tree.VarInsnNode;

public class TalkPatch {
    public static void main(String[] args) throws Exception {
        ClassNode cls = new ClassNode();
        new ClassReader(Files.readAllBytes(Paths.get(args[0]))).accept(cls, 0);
        int hooked = 0;
        for (MethodNode m : cls.methods) {
            for (AbstractInsnNode n : m.instructions.toArray()) {
                if (n instanceof MethodInsnNode && ((MethodInsnNode) n).name.equals("answer") && ((MethodInsnNode) n).owner.equals("Talk"))
                    throw new Exception("already patched; not patching again");
            }
            for (AbstractInsnNode n : m.instructions.toArray()) {
                // ALOAD player; GETFIELD Player.bfrSocketIn; INVOKEVIRTUAL readLine; ASTORE input
                if (!(n instanceof MethodInsnNode) || !((MethodInsnNode) n).name.equals("readLine")) continue;
                AbstractInsnNode field = n.getPrevious(), load = field == null ? null : field.getPrevious(), store = n.getNext();
                if (!(field instanceof FieldInsnNode) || !((FieldInsnNode) field).name.equals("bfrSocketIn")) continue;
                if (!(load instanceof VarInsnNode) || load.getOpcode() != Opcodes.ALOAD) continue;
                if (!(store instanceof VarInsnNode) || store.getOpcode() != Opcodes.ASTORE) continue;
                int player = ((VarInsnNode) load).var, input = ((VarInsnNode) store).var;
                InsnList hook = new InsnList();
                hook.add(new VarInsnNode(Opcodes.ALOAD, player));
                hook.add(new VarInsnNode(Opcodes.ALOAD, input));
                hook.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Talk", "answer", "(LPlayer;Ljava/lang/String;)Ljava/lang/String;", false));
                hook.add(new VarInsnNode(Opcodes.ASTORE, input));
                m.instructions.insert(store, hook);
                m.maxStack = Math.max(m.maxStack, 2);
                hooked++;
            }
        }
        if (hooked != 1) throw new Exception("expected one input read in " + args[0] + ", found " + hooked);
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched NPC answers (Talk.answer) in " + args[1]);
    }
}
