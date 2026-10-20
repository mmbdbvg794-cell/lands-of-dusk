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
 * Also, before the item's use script runs, Skills.useFirst(this, item)
 * puts the clicked item ahead of others with its name, so the script's
 * "removeitem trigger <name>" takes that one (it takes the first by name)
 * and not a fresh copy, which left the clicked one "used up". It goes in
 * just before "new Script", where the stack is empty.
 *
 * And getArmorMod() is replaced by Skills.armorMod(this): each piece's
 * share added up before rounding down, not after each piece.
 *
 * And in moveTo, a fighter that moved no longer flees for want of a foe
 * in its own vctEntities (only players keep one): BattleFix.sees.
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
import jdk.internal.org.objectweb.asm.tree.TypeInsnNode;
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
        TypeInsnNode script = null;
        int scripts = 0;
        for (AbstractInsnNode n : use.instructions.toArray())
            if (n.getOpcode() == Opcodes.NEW && ((TypeInsnNode) n).desc.equals("Script")) { script = (TypeInsnNode) n; scripts++; }
        if (scripts != 1) throw new Exception("expected one new Script in useItem, found " + scripts);
        InsnList first = new InsnList();
        first.add(new VarInsnNode(Opcodes.ALOAD, 0));
        first.add(new VarInsnNode(Opcodes.ALOAD, 3));
        first.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Skills", "useFirst", "(LLivingThing;LItem;)V", false));
        use.instructions.insertBefore(script, first);
        use.maxStack = Math.max(use.maxStack, 3);
        // getArmorMod() becomes "return Skills.armorMod(this)": the same
        // share of each piece, added up before rounding down (the engine
        // rounded after each piece, so sleeves or leggings under mod 20
        // added nothing).
        MethodNode armor = null;
        for (MethodNode m : cls.methods) if (m.name.equals("getArmorMod") && m.desc.equals("()I")) armor = m;
        if (armor == null) throw new Exception("no getArmorMod() in " + args[0]);
        armor.instructions.clear();
        armor.tryCatchBlocks.clear();
        if (armor.localVariables != null) armor.localVariables.clear();
        armor.instructions.add(new VarInsnNode(Opcodes.ALOAD, 0));
        armor.instructions.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Skills", "armorMod", "(LLivingThing;)I", false));
        armor.instructions.add(new jdk.internal.org.objectweb.asm.tree.InsnNode(Opcodes.IRETURN));
        armor.maxStack = 1;
        armor.maxLocals = 1;
        // moveTo: a fighter who moved flees unless it still sees a foe, read
        // from its vctEntities, which only players keep: creatures walking
        // toward a ranged attacker fled. "this.vctEntities.contains(foe)"
        // (aload 0, getfield, aload foe, invokevirtual) becomes
        // BattleFix.sees(this, foe): the getfield goes, the call changes.
        MethodNode move = null;
        for (MethodNode m : cls.methods) if (m.name.equals("moveTo") && m.desc.equals("(IIB)V")) move = m;
        if (move == null) throw new Exception("no moveTo(int, int, byte) in " + args[0]);
        int sees = 0;
        for (AbstractInsnNode n : move.instructions.toArray()) {
            if (n instanceof MethodInsnNode && ((MethodInsnNode) n).name.equals("sees")) throw new Exception("moveTo already patched; not patching again");
            if (!(n instanceof MethodInsnNode)) continue;
            MethodInsnNode call = (MethodInsnNode) n;
            if (!call.owner.equals("java/util/Vector") || !call.name.equals("contains")) continue;
            AbstractInsnNode arg = call.getPrevious(), field = arg.getPrevious();
            if (!(arg instanceof VarInsnNode) || !(field instanceof jdk.internal.org.objectweb.asm.tree.FieldInsnNode) || !((jdk.internal.org.objectweb.asm.tree.FieldInsnNode) field).name.equals("vctEntities")) continue;
            AbstractInsnNode self = field.getPrevious();
            if (!(self instanceof VarInsnNode) || ((VarInsnNode) self).var != 0) continue;
            move.instructions.remove(field);
            move.instructions.set(call, new MethodInsnNode(Opcodes.INVOKESTATIC, "BattleFix", "sees", "(LLivingThing;Ljava/lang/Object;)Z", false));
            sees++;
        }
        if (sees != 2) throw new Exception("expected 2 this.vctEntities.contains(foe) in moveTo, found " + sees);
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[1]), w.toByteArray());
        System.out.println("Patched the use message, armour adding up and creatures stepping in a fight in " + args[1]);
    }
}
