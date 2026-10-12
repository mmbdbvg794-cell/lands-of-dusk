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
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched logout saving and the login look (" + hooked + " returns) in " + args[1]);
    }
}
