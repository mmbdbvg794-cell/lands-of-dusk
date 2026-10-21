/*
 * Props seen by some players only (Props.sees: a prop file's "shownIf" or
 * "hiddenIf" flag), by editing the compiled engine with the JDK's ASM. The
 * engine asks its canSeeLivingThing script about players and creatures,
 * but sends every other object in view to everyone. Two places now ask
 * Props.sees(player, object) as well:
 *
 *   refreshEntities  (each move: what the player sees) before "is it on
 *           their list already?" (vctEntities.contains): unseen, it goes
 *           straight to the next object, so a new one isn't sent and one
 *           already sent is taken off their screen with the rest of what
 *           went out of view.
 *   addEntity  (something appears: each player in sight is told) after
 *           "already on their list?": unseen, on to the next player.
 *
 * Each jump goes to a place the loop already jumps to (its "next object"
 * and "next player"), so the class's frames stay as they are.
 *
 *   java --add-exports ... VisibilityPatch <DuskEngine.class in> <DuskEngine.class out>
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
import jdk.internal.org.objectweb.asm.tree.FrameNode;
import jdk.internal.org.objectweb.asm.tree.InsnList;
import jdk.internal.org.objectweb.asm.tree.JumpInsnNode;
import jdk.internal.org.objectweb.asm.tree.LabelNode;
import jdk.internal.org.objectweb.asm.tree.MethodInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodNode;
import jdk.internal.org.objectweb.asm.tree.VarInsnNode;

public class VisibilityPatch {
    static final String SEES = "(LLivingThing;Ljava/lang/Object;)Z";

    public static void main(String[] args) throws Exception {
        ClassNode cls = new ClassNode();
        new ClassReader(Files.readAllBytes(Paths.get(args[0]))).accept(cls, 0);
        for (MethodNode m : cls.methods)
            for (AbstractInsnNode n : m.instructions.toArray())
                if (n instanceof MethodInsnNode && ((MethodInsnNode) n).owner.equals("Props") && ((MethodInsnNode) n).name.equals("sees"))
                    throw new Exception("already patched; not patching again");
        refresh(method(cls, "refreshEntities", "(LLivingThing;)V"));
        add(method(cls, "addEntity", "(LDuskObject;)V"));
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched prop visibility (refreshEntities, addEntity) in " + args[1]);
    }

    static MethodNode method(ClassNode cls, String name, String desc) throws Exception {
        for (MethodNode m : cls.methods) if (m.name.equals(name) && m.desc.equals(desc)) return m;
        throw new Exception("no " + name + desc);
    }

    // The one "<who>.vctEntities.contains(<object>)" in m: the call.
    static MethodInsnNode contains(MethodNode m) throws Exception {
        MethodInsnNode found = null;
        int count = 0;
        for (AbstractInsnNode n : m.instructions.toArray()) {
            if (!(n instanceof MethodInsnNode)) continue;
            MethodInsnNode c = (MethodInsnNode) n;
            if (!c.owner.equals("java/util/Vector") || !c.name.equals("contains")) continue;
            AbstractInsnNode arg = c.getPrevious(), field = arg.getPrevious(), owner = field.getPrevious();
            if (!(arg instanceof VarInsnNode) || !(field instanceof FieldInsnNode) || !((FieldInsnNode) field).name.equals("vctEntities") || !(owner instanceof VarInsnNode)) continue;
            found = c;
            count++;
        }
        if (count != 1) throw new Exception("expected one vctEntities.contains in " + m.name + ", found " + count);
        return found;
    }

    // Before the check: unseen, on to "duskObject = duskObject.getNextObject()".
    static void refresh(MethodNode m) throws Exception {
        MethodInsnNode c = contains(m);
        VarInsnNode object = (VarInsnNode) c.getPrevious();
        VarInsnNode who = (VarInsnNode) c.getPrevious().getPrevious().getPrevious();
        if (who.var != 1) throw new Exception("refreshEntities: expected the player's vctEntities, got local " + who.var);
        MethodInsnNode next = null;
        int nexts = 0;
        for (AbstractInsnNode n : m.instructions.toArray())
            if (n instanceof MethodInsnNode && ((MethodInsnNode) n).name.equals("getNextObject")) { next = (MethodInsnNode) n; nexts++; }
        if (nexts != 1) throw new Exception("expected one getNextObject in refreshEntities, found " + nexts);
        AbstractInsnNode load = next.getPrevious();
        if (!(load instanceof VarInsnNode) || ((VarInsnNode) load).var != object.var) throw new Exception("refreshEntities: getNextObject isn't on the object checked");
        LabelNode target = framedLabel(load);
        InsnList f = new InsnList();
        f.add(new VarInsnNode(Opcodes.ALOAD, 1));
        f.add(new VarInsnNode(Opcodes.ALOAD, object.var));
        f.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Props", "sees", SEES, false));
        f.add(new JumpInsnNode(Opcodes.IFEQ, target));
        m.instructions.insertBefore(who, f);
        m.maxStack = Math.max(m.maxStack, 2);
    }

    // After "|| player.vctEntities.contains(o)) continue": unseen, continue too.
    static void add(MethodNode m) throws Exception {
        MethodInsnNode c = contains(m);
        VarInsnNode object = (VarInsnNode) c.getPrevious();
        VarInsnNode player = (VarInsnNode) c.getPrevious().getPrevious().getPrevious();
        // Either "ifne <next player>", or "ifeq <add>; goto <next player>".
        AbstractInsnNode after = c.getNext(), at;
        LabelNode target;
        if (after instanceof JumpInsnNode && after.getOpcode() == Opcodes.IFNE) {
            target = ((JumpInsnNode) after).label;
            at = after.getNext();
        } else if (after instanceof JumpInsnNode && after.getOpcode() == Opcodes.IFEQ && after.getNext() instanceof JumpInsnNode && after.getNext().getOpcode() == Opcodes.GOTO) {
            target = ((JumpInsnNode) after.getNext()).label;
            at = ((JumpInsnNode) after).label;
            while (at != null && at.getOpcode() < 0) at = at.getNext(); // past its label and frame
        } else throw new Exception("addEntity: expected a jump after contains");
        InsnList f = new InsnList();
        f.add(new VarInsnNode(Opcodes.ALOAD, player.var));
        f.add(new VarInsnNode(Opcodes.ALOAD, object.var));
        f.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Props", "sees", SEES, false));
        f.add(new JumpInsnNode(Opcodes.IFEQ, target));
        m.instructions.insertBefore(at, f);
        m.maxStack = Math.max(m.maxStack, 2);
    }

    // The label just before n (past line numbers), which must carry a frame:
    // the place the loop's own "continue"s land.
    static LabelNode framedLabel(AbstractInsnNode n) throws Exception {
        boolean frame = false;
        for (AbstractInsnNode p = n.getPrevious(); p != null && p.getOpcode() < 0; p = p.getPrevious()) {
            if (p instanceof FrameNode) frame = true;
            if (p instanceof LabelNode && frame) return (LabelNode) p;
        }
        throw new Exception("no framed label before the loop's next object");
    }
}
