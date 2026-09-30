"""Patches the CFR decompile of the live server's Commands and DuskServer
classes so they compile again, and hooks in Storage (server/Storage.java):

  Commands.parseCommand   hands each command to Storage.command, then
                          Talk.command (server/Talk.java) and
                          Props.command (server/Props.java), first
  DuskServer()            calls Storage.load and Talk.start before
                          accepting players
  "<prop", "<mob"         find mob and prop files whatever their case
                          (server/CaseFix.java)
  new DuskEngine()        becomes new FixedEngine(), which fixes garbled
                          entity messages and IDs freed twice
                          (server/FixedEngine.java)

Every change is an exact text replacement that must match once (or the
stated number of times), so a changed server fails loudly here instead of
being patched wrongly.

  python3 patch.py <dir with Commands.java and DuskServer.java>

Checked on 2026-09-30: the unpatched decompile of Commands, with only the
compile fixes below, recompiles to bytecode equivalent to the live class
(the same calls, constants and handlers; only inverted branches, extra
casts and register numbers differ).
"""
import sys, os

d = sys.argv[1]


def patch(name, edits):
    path = os.path.join(d, name)
    s = open(path).read()
    for old, new, times in edits:
        n = s.count(old)
        if n != times:
            sys.exit('%s: expected %d of:\n%s\nfound %d' % (name, times, old, n))
        s = s.replace(old, new)
    open(path, 'w').write(s)
    print('patched', name)


patch('Commands.java', [
    # Compile fixes for CFR's typing slips.
    ('''                        n12 = ((String)object).indexOf(" ");
                    }
                    return object3;''', '''                        n12 = ((String)object).indexOf(" ");
                    }
                    return (String)object3;''', 1),
    ('''                    object4 = duskEngine.vctBindPoints.elements();
                    while (object4.hasMoreElements()) {
                        Point point = (Point)object4.nextElement();''', '''                    Enumeration bindPoints = duskEngine.vctBindPoints.elements();
                    while (bindPoints.hasMoreElements()) {
                        Point point = (Point)bindPoints.nextElement();''', 1),
    ('''                    object = player.stmOut;
                    DataOutputStream dataOutputStream = object;''', '''                    DataOutputStream dataOutputStream = player.stmOut;''', 7),
    ('''            if (string.equals("playtime") || string.startsWith("playtime ")) {
                long l;
                LivingThing livingThing9;''', '''            if (string.equals("playtime") || string.startsWith("playtime ")) {
                long l;
                Object var11_185;
                LivingThing livingThing9;''', 1),
    # The live class adds to the inventory with Vector.add(Object), not
    # ItemVector.add(Item).
    ('''                livingThing.items.add(item);
                livingThing.updateItems();
                return "You get the " + (String)object + " from the " + container.strName;''', '''                livingThing.items.add((Object)item);
                livingThing.updateItems();
                return "You get the " + (String)object + " from the " + container.strName;''', 1),
    # The hook: storage commands before the built-in ones (after any
    # commands/ script of the same name, which runs first as before).
    ('''        catch (Exception exception) {
            if (object == null) {
                return null;
            }
            Player player = null;''', '''        catch (Exception exception) {
            if (object == null) {
                return null;
            }
            String storageReply = Storage.command(livingThing, duskEngine, (String)object);
            if (storageReply != null) {
                return storageReply;
            }
            String talkReply = Talk.command(livingThing, duskEngine, (String)object);
            if (talkReply != null) {
                return talkReply.length() == 0 ? null : talkReply;
            }
            String propsReply = Props.command(livingThing, duskEngine, (String)object);
            if (propsReply != null) {
                return propsReply;
            }
            Player player = null;''', 1),
    # "<prop name" and "<mob name": find the file whatever its case (the
    # command is lowercased; many mob and prop files have capitals).
    ('''Prop prop = duskEngine.getProp(string = string.substring(5));''',
     '''Prop prop = duskEngine.getProp(string = CaseFix.file("defProps", string.substring(5)));''', 1),
    ('''Mob mob = new Mob(string, livingThing.intLocX, livingThing.intLocY, duskEngine);''',
     '''Mob mob = new Mob(CaseFix.file("defMobs", string), livingThing.intLocX, livingThing.intLocY, duskEngine);''', 1),
])

patch('DuskServer.java', [
    # The engine with the addEntity and killDuskObject fixes
    # (server/FixedEngine.java).
    ('''DuskEngine engGame = new DuskEngine();''', '''DuskEngine engGame = new FixedEngine();''', 1),
    # CFR leaves a break after the endless accept loop.
    ('''                continue;
            }
            break;
        }''', '''                continue;
            }
        }''', 1),
    ('''    public DuskServer() {
        try {''', '''    public DuskServer() {
        Storage.load(this.engGame);
        Props.loadSignNames(this.engGame);
        Talk.start(this.engGame);
        try {''', 1),
])
