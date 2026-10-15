/*
 * Players are saved when they log out or lose their connection again.
 *
 * Player.close(boolean save) marked the player as no longer working first
 * and only then called savePlayer(), which does nothing for a player who
 * isn't working; so logging out, closing the tab or a dropped connection
 * never saved, and whatever happened since the game loop's last save
 * (about 18 seconds) was lost: steps taken, items, quest flags. This adds
 * one call at the start of close(boolean), to Skills.beforeClose(this,
 * save), which saves while the player still counts as working. Straight
 * code, no branches, so the method's frames stay as they are.
 *
 * And loadRace(), which sets everyone's image from their race at every
 * login, calls Sex.afterRace(this) just before each of its returns, so a
 * female character gets her image before anyone sees her
 * (server/Sex.java). Again no branches added.
 *
 * And chatMessage(String) starts with text = Talk.forClient(this, text):
 * what NPCs say in the browser's words, put in the old Java client's for
 * its players (server/Talk.java); null sends nothing. Its one branch jumps
 * to a frame the same as on entry.
 *
 * And the read timeout set on each player's connection goes from 10
 * minutes to 30: a player who sends nothing that long is logged out.
 *
 *   java --add-exports ... PlayerPatch <Player.class in> <Player.class out>
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.nio.file.Files;
import java.nio.file.Paths;
import jdk.internal.org.objectweb.asm.ClassReader;
import jdk.internal.org.objectweb.asm.ClassWriter;
import jdk.internal.org.objectweb.asm.Opcodes;
import jdk.internal.org.objectweb.asm.tree.ClassNode;
import jdk.internal.org.objectweb.asm.tree.InsnList;
import jdk.internal.org.objectweb.asm.tree.MethodInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodNode;
import jdk.internal.org.objectweb.asm.tree.VarInsnNode;

public class PlayerPatch {
    static final int IDLE_MS = 30 * 60 * 1000;

    public static void main(String[] args) throws Exception {
        ClassNode cls = new ClassNode();
        new ClassReader(Files.readAllBytes(Paths.get(args[0]))).accept(cls, 0);
        MethodNode close = null;
        for (MethodNode m : cls.methods) if (m.name.equals("close") && m.desc.equals("(Z)V")) close = m;
        if (close == null) throw new Exception("no close(boolean) in " + args[0]);
        for (java.util.Iterator<jdk.internal.org.objectweb.asm.tree.AbstractInsnNode> it = close.instructions.iterator(); it.hasNext();) {
            jdk.internal.org.objectweb.asm.tree.AbstractInsnNode n = it.next();
            if (n instanceof MethodInsnNode && ((MethodInsnNode) n).name.equals("beforeClose")) throw new Exception("already patched; not patching again");
        }
        InsnList save = new InsnList();
        save.add(new VarInsnNode(Opcodes.ALOAD, 0));
        save.add(new VarInsnNode(Opcodes.ILOAD, 1));
        save.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Skills", "beforeClose", "(LPlayer;Z)V", false));
        close.instructions.insert(save);
        close.maxStack = Math.max(close.maxStack, 2);
        MethodNode race = null;
        for (MethodNode m : cls.methods) if (m.name.equals("loadRace") && m.desc.equals("()V")) race = m;
        if (race == null) throw new Exception("no loadRace() in " + args[0]);
        int hooked = 0;
        for (jdk.internal.org.objectweb.asm.tree.AbstractInsnNode n : race.instructions.toArray()) {
            if (n.getOpcode() != Opcodes.RETURN) continue;
            InsnList after = new InsnList();
            after.add(new VarInsnNode(Opcodes.ALOAD, 0));
            after.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Sex", "afterRace", "(LPlayer;)V", false));
            race.instructions.insertBefore(n, after);
            hooked++;
        }
        if (hooked == 0) throw new Exception("loadRace() has no return");
        race.maxStack = Math.max(race.maxStack, 1);
        MethodNode chat = null;
        for (MethodNode m : cls.methods) if (m.name.equals("chatMessage") && m.desc.equals("(Ljava/lang/String;)V")) chat = m;
        if (chat == null) throw new Exception("no chatMessage(String) in " + args[0]);
        InsnList words = new InsnList();
        words.add(new VarInsnNode(Opcodes.ALOAD, 0));
        words.add(new VarInsnNode(Opcodes.ALOAD, 1));
        words.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Talk", "forClient", "(LPlayer;Ljava/lang/String;)Ljava/lang/String;", false));
        words.add(new VarInsnNode(Opcodes.ASTORE, 1));
        // null: send nothing. (A branch, so its target gets a frame: the
        // same locals as on entry, nothing on the stack.)
        jdk.internal.org.objectweb.asm.tree.LabelNode go = new jdk.internal.org.objectweb.asm.tree.LabelNode();
        words.add(new VarInsnNode(Opcodes.ALOAD, 1));
        words.add(new jdk.internal.org.objectweb.asm.tree.JumpInsnNode(Opcodes.IFNONNULL, go));
        words.add(new jdk.internal.org.objectweb.asm.tree.InsnNode(Opcodes.RETURN));
        words.add(go);
        words.add(new jdk.internal.org.objectweb.asm.tree.FrameNode(Opcodes.F_SAME, 0, null, 0, null));
        chat.instructions.insert(words);
        chat.maxStack = Math.max(chat.maxStack, 2);
        // A quiet connection is dropped after 30 minutes, not 10 (the read
        // timeout set when a player connects): long enough to sleep off a
        // fight, or step away, without "Goodbye.".
        int timeouts = 0;
        for (MethodNode m : cls.methods) {
            for (jdk.internal.org.objectweb.asm.tree.AbstractInsnNode n : m.instructions.toArray()) {
                if (!(n instanceof jdk.internal.org.objectweb.asm.tree.LdcInsnNode)) continue;
                jdk.internal.org.objectweb.asm.tree.LdcInsnNode ldc = (jdk.internal.org.objectweb.asm.tree.LdcInsnNode) n;
                if (!Integer.valueOf(600000).equals(ldc.cst)) continue;
                jdk.internal.org.objectweb.asm.tree.AbstractInsnNode next = n.getNext();
                if (!(next instanceof MethodInsnNode) || !((MethodInsnNode) next).name.equals("setSoTimeout")) continue;
                ldc.cst = Integer.valueOf(IDLE_MS);
                timeouts++;
            }
        }
        if (timeouts != 1) throw new Exception("expected one 10-minute read timeout in " + args[0] + ", found " + timeouts);
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched logout saving, the login look (" + hooked + " returns), classic words and the 30-minute idle timeout in " + args[1]);
    }
}
