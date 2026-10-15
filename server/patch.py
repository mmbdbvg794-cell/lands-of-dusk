"""Patches the CFR decompile of the live server's Commands and DuskServer
classes so they compile again, and hooks in Storage (server/Storage.java):

  Commands.parseCommand   hands each command to Classes.gate and
                          Classes.command (server/Classes.java), then
                          Storage.command, then
                          Talk.command (server/Talk.java) and
                          Props.command (server/Props.java), first
  DuskServer()            calls Storage.load and Talk.start before
                          accepting players
  look                    ends with "." only once (Props.sentence)
  "<prop", "<mob"         find mob and prop files whatever their case
                          (server/CaseFix.java)
  accept()                wraps each connection in BridgedSocket (the
                          player's real address, from the bridge) and turns
                          away banned devices (server/Bans.java)
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
    # "buy water" buys one (the Java client's Merchant window always sends
    # a number; players typing it often don't).
    ('''                catch (Exception exception9) {
                    return "How many of what do you want to buy?";''', '''                catch (Exception exception9) {
                    n = 1;''', 1),
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
    # Trainers' stats by their full names, and Spell Power on casting
    # (server/Skills.java).
    ('''                        merchant.train((String)object, n, livingThing);''', '''                        Skills.train(merchant, (String)object, n, livingThing);''', 1),
    ('''merchant.train((String)object, n, livingThing.thnFollowing);''', '''Skills.train(merchant, (String)object, n, livingThing.thnFollowing);''', 1),
    ('''                livingThing.castSpell(string);
                return null;''', '''                Skills.cast(livingThing, string);
                return null;''', 1),
    # The live class adds to the inventory with Vector.add(Object), not
    # ItemVector.add(Item).
    ('''                livingThing.items.add(item);
                livingThing.updateItems();
                return "You get the " + (String)object + " from the " + container.strName;''', '''                livingThing.items.add((Object)item);
                livingThing.updateItems();
                return "You get the " + (String)object + " from the " + container.strName;''', 1),
    # Looking at an item, prop or sign ends the text with "." only when it
    # doesn't end in one already (no more "..": Props.sentence).
    ('''return "You see " + item.strDescription + ".";''', '''return Props.sentence("You see " + item.strDescription);''', 1),
    ('''return "You see " + prop.strDescription + ".";''', '''return Props.sentence("You see " + prop.strDescription);''', 1),
    ('''return "The sign says " + sign.strMessage + ".";''', '''return Props.sentence("The sign says " + sign.strMessage);''', 1),
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
            String classGate = Classes.gate(livingThing, duskEngine, (String)object);
            if (classGate != null) {
                return classGate;
            }
            String classReply = Classes.command(livingThing, duskEngine, (String)object);
            if (classReply != null) {
                return classReply;
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
                return propsReply.length() == 0 ? null : propsReply;
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
    # Real addresses from the bridge (server/BridgedSocket.java), and banned
    # devices turned away (server/Bans.java).
    ('''                    this.sckStore = this.srvServer.accept();
                    this.sckStore.setSoTimeout(30000);
                    new Player(this.sckStore, this.engGame);''', '''                    this.sckStore = BridgedSocket.wrap(this.srvServer.accept());
                    this.sckStore.setSoTimeout(30000);
                    if (Bans.refuse(this.sckStore)) continue;
                    new Player(this.sckStore, this.engGame);''', 1),
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
        BridgedSocket.start();
        Bans.load();
        Social.load();
        Skills.start(this.engGame);
        Library.startRespawning(this.engGame);
        Talk.start(this.engGame);
        try {''', 1),
])
