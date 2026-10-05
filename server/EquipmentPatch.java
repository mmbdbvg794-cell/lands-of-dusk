/*
 * Scripts can ask whether someone wears an item by its name again:
 * `isWearing trigger "gasmask"`.
 *
 * This engine's Equipment.isWearing(String) reads its argument as an item
 * ID number (Integer.parseInt), so every old script naming the item
 * (the swamp's gas mask, the miner's shovel, the thieves' pick, the flame
 * robe) failed with a NumberFormatException and did nothing. This swaps
 * the method's body for Skills.isWearing(this, name), which takes a name
 * (any worn item called that, whatever its case) or, as before, an ID.
 *
 *   java --add-exports ... EquipmentPatch <Equipment.class in> <out>
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
import jdk.internal.org.objectweb.asm.tree.InsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodNode;
import jdk.internal.org.objectweb.asm.tree.VarInsnNode;

public class EquipmentPatch {
    public static void main(String[] args) throws Exception {
        ClassNode cls = new ClassNode();
        new ClassReader(Files.readAllBytes(Paths.get(args[0]))).accept(cls, 0);
        MethodNode m = null;
        for (MethodNode n : cls.methods) if (n.name.equals("isWearing") && n.desc.equals("(Ljava/lang/String;)Z")) m = n;
        if (m == null) throw new Exception("no isWearing(String) in " + args[0]);
        for (AbstractInsnNode n : m.instructions.toArray()) {
            if (n instanceof MethodInsnNode && ((MethodInsnNode) n).owner.equals("Skills")) throw new Exception("already patched; not patching again");
        }
        InsnList body = new InsnList();
        body.add(new VarInsnNode(Opcodes.ALOAD, 0));
        body.add(new VarInsnNode(Opcodes.ALOAD, 1));
        body.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Skills", "isWearing", "(LEquipment;Ljava/lang/String;)Z", false));
        body.add(new InsnNode(Opcodes.IRETURN));
        m.instructions.clear();
        m.instructions.add(body);
        m.tryCatchBlocks.clear();
        if (m.localVariables != null) m.localVariables.clear();
        m.maxStack = 2;
        m.maxLocals = 2;
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched isWearing by name in " + args[1]);
    }
}
