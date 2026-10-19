/*
 * Fixes players' MP healing in the game loop (DuskEngine.run), which
 * doesn't decompile cleanly enough to rebuild, by editing just those
 * instructions in the compiled class with the JDK's own copy of ASM.
 *
 * The loop healed a player's MP, when awake, by their CON instead of their
 * WIS, and then capped MP at their max HP instead of their max MP (so a
 * character whose max MP is above their max HP could never fill up, and
 * lost MP down to their max HP each time it ran). The fix swaps the four
 * names in that one place: cons -> wisd, consbon -> wisdbon,
 * maxhp -> maxmp, hpbon -> mpbon. It finds the place by the run of names
 * the loop uses there, and refuses to write anything unless that run is
 * found exactly once.
 *
 * And starting a fight out of reach said only "They're too far away.":
 * reach is counted along the grid, so a creature on a diagonal square is
 * two away, which players can't see. The message now says so.
 *
 *   javac --add-exports java.base/jdk.internal.org.objectweb.asm=ALL-UNNAMED \
 *         --add-exports java.base/jdk.internal.org.objectweb.asm.tree=ALL-UNNAMED EnginePatch.java
 *   java  --add-exports ... EnginePatch <DuskEngine.class in> <DuskEngine.class out>
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import jdk.internal.org.objectweb.asm.ClassReader;
import jdk.internal.org.objectweb.asm.ClassWriter;
import jdk.internal.org.objectweb.asm.tree.AbstractInsnNode;
import jdk.internal.org.objectweb.asm.tree.ClassNode;
import jdk.internal.org.objectweb.asm.tree.LdcInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodNode;

public class EnginePatch {
    // The names the player MP block loads, in order, and what they become.
    static final String[] FIND = { "wisd", "wisdbon", "cons", "consbon", "mp", "maxhp", "hpbon" };
    static final String[] FIXED = { "wisd", "wisdbon", "wisd", "wisdbon", "mp", "maxmp", "mpbon" };

    static final String FAR = "They're too far away.\n";
    static final String FAR_FIXED = "They're too far away: stand right beside them (a diagonal square counts as two).\n";

    public static void main(String[] args) throws Exception {
        ClassNode cls = new ClassNode();
        new ClassReader(Files.readAllBytes(Paths.get(args[0]))).accept(cls, 0);
        MethodNode run = null;
        for (MethodNode m : cls.methods) if (m.name.equals("run") && m.desc.equals("()V")) run = m;
        if (run == null) throw new Exception("no run() in " + args[0]);
        // Every string the method loads, in order.
        List<LdcInsnNode> strings = new ArrayList<LdcInsnNode>();
        for (AbstractInsnNode n = run.instructions.getFirst(); n != null; n = n.getNext()) {
            if (n instanceof LdcInsnNode && ((LdcInsnNode) n).cst instanceof String) strings.add((LdcInsnNode) n);
        }
        int found = -1, count = 0;
        for (int i = 0; i + FIND.length <= strings.size(); i++) {
            boolean match = true;
            for (int k = 0; k < FIND.length && match; k++) match = FIND[k].equals(strings.get(i + k).cst);
            if (match) { found = i; count++; }
        }
        if (count != 1) throw new Exception("expected the MP healing code once, found it " + count + " times; not patching");
        for (int k = 0; k < FIND.length; k++) strings.get(found + k).cst = FIXED[k];
        // The attack range message, once anywhere in the class.
        int far = 0;
        for (MethodNode m : cls.methods)
            for (AbstractInsnNode n = m.instructions.getFirst(); n != null; n = n.getNext())
                if (n instanceof LdcInsnNode && FAR.equals(((LdcInsnNode) n).cst)) { ((LdcInsnNode) n).cst = FAR_FIXED; far++; }
        if (far != 1) throw new Exception("expected the attack range message once, found it " + far + " times; not patching");
        ClassWriter w = new ClassWriter(0); // same frames and sizes: only constants changed
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched MP healing and the attack range message in " + args[1]);
    }
}
