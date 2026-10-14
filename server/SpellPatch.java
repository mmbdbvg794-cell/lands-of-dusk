/*
 * Spells cost and unlock as their own files say, and scripts can read a spell
 * group's level, by editing the compiled engine with the JDK's ASM:
 *
 *   living  LivingThing.castSpell works out the group points a spell needs
 *           from its place in the group (100 * place / (spells - 1)); just
 *           before it checks them, Skills.spellUnlock(that, spell) puts in
 *           the "unlock <n>" line of defSpells/<spell> if there is one. It
 *           then charges (110 - (group skill - unlock %)) / 2 MP; right
 *           after that sum, Skills.spellCost(sum, spell) gives the "mp <n>"
 *           line instead, if there is one.
 *           (SpellGroup, which lists the costs in the stats, is rebuilt
 *           from source: server/SpellGroup.java.)
 *   engine  DuskEngine.refreshEntities sends a trainer's list to whoever
 *           stands on it; the list goes through Classes.wares(who, list)
 *           first, which leaves out spell schools closed to them.
 *   script  Script reads "<who> skill <name>" with LivingThing.getSkill,
 *           which only knows skills; spell groups are spells. That one
 *           call becomes Skills.scriptSkill, which falls back to the spell
 *           group of that name, so a heal can grow with "clerical group".
 *
 * Each place is found by its instructions and must be found exactly as
 * expected, or nothing is written.
 *
 *   java --add-exports ... SpellPatch living|engine|script <class in> <class out>
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import jdk.internal.org.objectweb.asm.ClassReader;
import jdk.internal.org.objectweb.asm.ClassWriter;
import jdk.internal.org.objectweb.asm.Opcodes;
import jdk.internal.org.objectweb.asm.tree.AbstractInsnNode;
import jdk.internal.org.objectweb.asm.tree.ClassNode;
import jdk.internal.org.objectweb.asm.tree.InsnList;
import jdk.internal.org.objectweb.asm.tree.IntInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodInsnNode;
import jdk.internal.org.objectweb.asm.tree.MethodNode;
import jdk.internal.org.objectweb.asm.tree.VarInsnNode;

public class SpellPatch {
    static final String COST = "(ILjava/lang/Object;)I";

    public static void main(String[] args) throws Exception {
        ClassNode cls = new ClassNode();
        new ClassReader(Files.readAllBytes(Paths.get(args[1]))).accept(cls, 0);
        String what = args[0];
        if (what.equals("living")) living(cls);
        else if (what.equals("script")) script(cls);
        else if (what.equals("engine")) engine(cls);
        else throw new Exception("living, engine or script");
        ClassWriter w = new ClassWriter(0);
        cls.accept(w);
        Files.write(Paths.get(args[2]), w.toByteArray());
        System.out.println("Patched spell costs (" + what + ") in " + args[2]);
    }

    static MethodNode method(ClassNode cls, String name, String desc) throws Exception {
        for (MethodNode m : cls.methods) if (m.name.equals(name) && m.desc.equals(desc)) return m;
        throw new Exception("no " + name + desc + " in " + cls.name);
    }

    static void notTwice(MethodNode m) throws Exception {
        for (AbstractInsnNode n : m.instructions.toArray())
            if (n instanceof MethodInsnNode && ((MethodInsnNode) n).owner.equals("Skills")) throw new Exception("already patched; not patching again");
    }

    // The "/ 2" ending each (110 - ...) sum: the first iconst_2, idiv after
    // each bipush 110.
    static List<AbstractInsnNode> halves(MethodNode m) {
        List<AbstractInsnNode> out = new ArrayList<AbstractInsnNode>();
        AbstractInsnNode[] a = m.instructions.toArray();
        for (int i = 0; i < a.length; i++) {
            if (a[i].getOpcode() != Opcodes.BIPUSH || ((IntInsnNode) a[i]).operand != 110) continue;
            for (int j = i + 1; j + 1 < a.length; j++) {
                if (a[j].getOpcode() == Opcodes.ICONST_2 && a[j + 1].getOpcode() == Opcodes.IDIV) {
                    out.add(a[j + 1]);
                    break;
                }
            }
        }
        return out;
    }

    static void cost(MethodNode m, AbstractInsnNode after, int nameVar) {
        InsnList call = new InsnList();
        call.add(new VarInsnNode(Opcodes.ALOAD, nameVar));
        call.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Skills", "spellCost", COST, false));
        m.instructions.insert(after, call);
        m.maxStack += 1;
    }

    static void living(ClassNode cls) throws Exception {
        MethodNode m = method(cls, "castSpell", "(Ljava/lang/String;)V");
        notTwice(m);
        // The spell's name: what getSpellNumber is asked about.
        int name = -1, calls = 0;
        AbstractInsnNode[] a = m.instructions.toArray();
        for (int i = 0; i < a.length; i++) {
            if (!(a[i] instanceof MethodInsnNode) || !((MethodInsnNode) a[i]).name.equals("getSpellNumber")) continue;
            calls++;
            AbstractInsnNode p = a[i].getPrevious();
            if (p.getOpcode() == Opcodes.CHECKCAST) p = p.getPrevious();
            if (p.getOpcode() == Opcodes.ALOAD) name = ((VarInsnNode) p).var;
        }
        if (calls != 1 || name < 0) throw new Exception("expected one getSpellNumber(<local>) in castSpell, found " + calls);
        List<AbstractInsnNode> h = halves(m);
        if (h.size() != 1) throw new Exception("expected one (110 - ...) / 2 in castSpell, found " + h.size());
        cost(m, h.get(0), name);
        // The unlock: the place goes into a local (istore after
        // getSpellNumber), becomes 100 * place / (n - 1), and is checked by
        // "skill == 0 || skill < unlock": iload s, ifeq, iload s, iload u,
        // if_icmpge. The unlock is replaced just before that check (where
        // both paths meet and the stack is empty).
        int unlock = -1;
        for (AbstractInsnNode n : a)
            if (n instanceof MethodInsnNode && ((MethodInsnNode) n).name.equals("getSpellNumber") && n.getNext().getOpcode() == Opcodes.ISTORE)
                unlock = ((VarInsnNode) n.getNext()).var;
        AbstractInsnNode check = null;
        int checks = 0;
        for (AbstractInsnNode n : m.instructions.toArray()) {
            AbstractInsnNode b = n.getNext(), c = b == null ? null : b.getNext(), d = c == null ? null : c.getNext(), e = d == null ? null : d.getNext();
            if (n.getOpcode() == Opcodes.ILOAD && b != null && b.getOpcode() == Opcodes.IFEQ && c != null && c.getOpcode() == Opcodes.ILOAD
                && ((VarInsnNode) c).var == ((VarInsnNode) n).var && d != null && d.getOpcode() == Opcodes.ILOAD && ((VarInsnNode) d).var == unlock
                && e != null && e.getOpcode() == Opcodes.IF_ICMPGE) { check = n; checks++; }
        }
        if (unlock < 0 || checks != 1) throw new Exception("expected one unlock check in castSpell, found " + checks);
        InsnList set = new InsnList();
        set.add(new VarInsnNode(Opcodes.ILOAD, unlock));
        set.add(new VarInsnNode(Opcodes.ALOAD, name));
        set.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Skills", "spellUnlock", COST, false));
        set.add(new VarInsnNode(Opcodes.ISTORE, unlock));
        m.instructions.insertBefore(check, set);
    }

    static void engine(ClassNode cls) throws Exception {
        MethodNode m = method(cls, "refreshEntities", "(LLivingThing;)V");
        int found = 0;
        AbstractInsnNode send = null;
        for (AbstractInsnNode n : m.instructions.toArray()) {
            if (n instanceof MethodInsnNode && ((MethodInsnNode) n).owner.equals("Classes")) throw new Exception("already patched; not patching again");
            if (!(n instanceof MethodInsnNode)) continue;
            MethodInsnNode c = (MethodInsnNode) n;
            AbstractInsnNode a = real(c.getNext()), b = a == null ? null : real(a.getNext());
            if (c.name.equals("send") && c.desc.equals("(Ljava/lang/String;)V") && a != null && a.getOpcode() == Opcodes.ALOAD
                && ((VarInsnNode) a).var == 1 && b instanceof MethodInsnNode && ((MethodInsnNode) b).name.equals("updateSell")) { send = c; found++; }
        }
        if (found != 1) throw new Exception("expected one send(list) before updateSell in refreshEntities, found " + found);
        // stack [who, list] -> [who, Classes.wares(who, list)]
        InsnList f = new InsnList();
        f.add(new VarInsnNode(Opcodes.ALOAD, 1));
        f.add(new jdk.internal.org.objectweb.asm.tree.InsnNode(Opcodes.SWAP));
        f.add(new MethodInsnNode(Opcodes.INVOKESTATIC, "Classes", "wares", "(LLivingThing;Ljava/lang/String;)Ljava/lang/String;", false));
        m.instructions.insertBefore(send, f);
        m.maxStack += 1;
    }

    // The next real instruction (labels, line numbers and frames skipped).
    static AbstractInsnNode real(AbstractInsnNode n) {
        while (n != null && n.getOpcode() < 0) n = n.getNext();
        return n;
    }

    static void script(ClassNode cls) throws Exception {
        int found = 0;
        for (MethodNode m : cls.methods) {
            for (AbstractInsnNode n : m.instructions.toArray()) {
                if (!(n instanceof MethodInsnNode)) continue;
                MethodInsnNode c = (MethodInsnNode) n;
                if (c.owner.equals("Skills")) throw new Exception("already patched; not patching again");
                if (c.getOpcode() == Opcodes.INVOKEVIRTUAL && c.owner.equals("LivingThing") && c.name.equals("getSkill") && c.desc.equals("(Ljava/lang/String;)B")) {
                    m.instructions.set(c, new MethodInsnNode(Opcodes.INVOKESTATIC, "Skills", "scriptSkill", "(LLivingThing;Ljava/lang/String;)B", false));
                    found++;
                }
            }
        }
        if (found != 1) throw new Exception("expected one getSkill call in Script, found " + found);
    }
}
