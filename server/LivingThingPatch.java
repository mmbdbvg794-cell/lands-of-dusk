/*
 * Using an item says what was done with it: "You use the crystal box",
 * not "You eat the crystal box".
 *
 * LivingThing.useItem ends with "You " + (drinking ? "drink" : "eat") +
 * " the " + name, so everything that isn't drunk was eaten: potions, boxes,
 * books. This swaps the "eat" for Skills.useVerb(item) (eat for food, drink
 * for drink, use for anything else): the item is in local 3 there, and
 * the stack is the same before and after, so the frames stay as they are.
 *
 *   java --add-exports ... LivingThingPatch <LivingThing.class in> <out>
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
import jdk.internal.org.objectweb.asm.tree.InsnList;
import jdk.internal.org.objectweb.asm.tree.LdcInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodNode;
import jdk.internal.org.objectweb.asm.tree.VarInsnNode;

public class LivingThingPatch {
    public static void main(String[] args) throws Exception {
        ClassNode cls = new ClassNode();
        new ClassReader(Files.readAllBytes(Paths.get(args[0]))).accept(cls, 0);
        MethodNode use = null;
        for (MethodNode m : cls.methods) if (m.name.equals("useItem") && m.desc.equals("(Ljava/lang/String;I)V")) use = m;
        if (use == null) throw new Exception("no useItem(String, int) in " + args[0]);
        LdcInsnNode eat = null;
        int count = 0;
        for (AbstractInsnNode n : use.instructions.toArray()) {
            if (n instanceof MethodInsnNode && ((MethodInsnNode) n).name.equals("useVerb")) throw new Exception("already patched; not patching again");
            if (n instanceof LdcInsnNode && "eat".equals(((LdcInsnNode) n).cst)) { eat = (LdcInsnNode) n; count++; }
        }
        if (count != 1) throw new Exception("expected one \"eat\" in useItem, found " + count);
        InsnList verb = new InsnList();
        verb.add(new VarInsnNode(Opcodes.ALOAD, 3));
        verb.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Skills", "useVerb", "(LItem;)Ljava/lang/String;", false));
        use.instructions.insert(eat, verb);
        use.instructions.remove(eat);
        use.maxStack = Math.max(use.maxStack, 3);
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched the use message in " + args[1]);
    }
}
