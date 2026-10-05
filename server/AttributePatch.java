/*
 * AC bonuses show in the stats.
 *
 * Armor spells and worn items raise the "acbon" bonus (Script's "inc
 * trigger acbonus"), which fights count (LivingThing's AC), but the stats
 * line looked up "acdbon", a typo, so an AC bonus never showed. This
 * changes that one string in AttributeManager to "acbon".
 *
 *   java --add-exports ... AttributePatch <AttributeManager.class in> <out>
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.nio.file.Files;
import java.nio.file.Paths;
import jdk.internal.org.objectweb.asm.ClassReader;
import jdk.internal.org.objectweb.asm.ClassWriter;
import jdk.internal.org.objectweb.asm.tree.AbstractInsnNode;
import jdk.internal.org.objectweb.asm.tree.ClassNode;
import jdk.internal.org.objectweb.asm.tree.LdcInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodNode;

public class AttributePatch {
    public static void main(String[] args) throws Exception {
        ClassNode cls = new ClassNode();
        new ClassReader(Files.readAllBytes(Paths.get(args[0]))).accept(cls, 0);
        int n = 0;
        for (MethodNode m : cls.methods) {
            for (AbstractInsnNode i : m.instructions.toArray()) {
                if (i instanceof LdcInsnNode && "acdbon".equals(((LdcInsnNode) i).cst)) {
                    ((LdcInsnNode) i).cst = "acbon";
                    n++;
                }
            }
        }
        if (n == 0) throw new Exception("no \"acdbon\" in " + args[0] + " (already patched?)");
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched the AC bonus in the stats (" + n + ") in " + args[1]);
    }
}
