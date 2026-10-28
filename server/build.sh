#!/bin/sh
# Builds Storage plus the patched Commands and DuskServer classes against
# the live server's classes, into $OUT (default /tmp/dusk-storage-build/out).
# Touches nothing in ~/DuskRPG; server/install.sh installs the result.
#
#   ssh duskserver 'sh -s' < server/build.sh      (after copying server/ over:
#   tools/deploy.sh does both)
#
# Needs server/Storage.java, server/patch.py and cfr.jar (the CFR 0.152
# decompiler, SHA-1 48ef4892cfe8feffddbbd0ff077735140557db74) in $SRC.
set -eu
GAME=${GAME:-$HOME/DuskRPG}
SRC=${SRC:-$HOME/dusk-browser-client/server}
WORK=${WORK:-/tmp/dusk-storage-build}
rm -rf "$WORK"
mkdir -p "$WORK/classes" "$WORK/src" "$WORK/out"
# The live classes as they are now (without any Storage from before).
cp "$GAME"/*.class "$WORK/classes/"
rm -f "$WORK/classes/Storage.class" "$WORK/classes/CaseFix.class" "$WORK/classes/FixedEngine.class" "$WORK/classes/Talk.class" "$WORK/classes/Talk\$1.class" "$WORK/classes/Props.class" "$WORK/classes/BridgedSocket.class" "$WORK/classes/Bans.class" "$WORK/classes/MapStore.class" "$WORK/classes/Social.class" "$WORK/classes/Skills.class" "$WORK/classes/Skills\$1.class" "$WORK/classes/Library.class" "$WORK/classes/Library\$1.class" "$WORK/classes/Ferry.class" "$WORK/classes/Ferry\$1.class" "$WORK/classes/Ferry\$Port.class" "$WORK/classes/Who.class" "$WORK/classes/Who\$1.class" "$WORK/classes/Quests.class" "$WORK/classes/Quests\$Goal.class" "$WORK/classes/Quests\$1.class" "$WORK/classes/Conditions.class" "$WORK/classes/Conditions\$1.class" "$WORK/classes/Trade.class" "$WORK/classes/Trade\$Side.class" "$WORK/classes/Trade\$Session.class" "$WORK/classes/Mail.class" "$WORK/classes/Mail\$1.class" "$WORK/classes/Sex.class" "$WORK/classes/Classes.class" "$WORK/classes/Classes\$Def.class" "$WORK/classes/Crafting.class" "$WORK/classes/Crafting\$1.class" "$WORK/classes/Crafting\$Source.class" "$WORK/classes/Crafting\$Store.class" "$WORK/classes/Crafting\$Work.class" "$WORK/classes/Crafting\$Recipe.class" "$WORK/classes/Words.class"
cd "$WORK"
# If Storage is installed already, decompile the originals it replaced.
if [ -f "$GAME/storage-originals/Commands.class" ]; then
  cp "$GAME/storage-originals/Commands.class" "$GAME/storage-originals/DuskServer.class" classes/
fi
java -jar "$SRC/cfr.jar" classes/Commands.class classes/DuskServer.class --outputdir src --silent true >/dev/null
python3 "$SRC/patch.py" src
cp "$SRC/Storage.java" "$SRC/CaseFix.java" "$SRC/FixedEngine.java" "$SRC/Talk.java" "$SRC/Props.java" "$SRC/BridgedSocket.java" "$SRC/Bans.java" "$SRC/MapStore.java" "$SRC/Social.java" "$SRC/Trade.java" "$SRC/Skills.java" "$SRC/Library.java" "$SRC/Ferry.java" "$SRC/Who.java" "$SRC/Quests.java" "$SRC/Conditions.java" "$SRC/Admin.java" "$SRC/Housing.java" "$SRC/Creatures.java" "$SRC/Mail.java" "$SRC/WorldBoss.java" "$SRC/Party.java" "$SRC/Duel.java" "$SRC/Sex.java" "$SRC/Classes.java" "$SRC/Crafting.java" "$SRC/Achievements.java" "$SRC/BattleFix.java" "$SRC/SpellGroup.java" "$SRC/Clans.java" "$SRC/ClanHalls.java" "$SRC/Words.java" src/
javac -nowarn -encoding UTF-8 -d out -cp classes src/Storage.java src/CaseFix.java src/FixedEngine.java src/Talk.java src/Props.java src/BridgedSocket.java src/Bans.java src/MapStore.java src/Social.java src/Trade.java src/Skills.java src/Library.java src/Ferry.java src/Who.java src/Quests.java src/Conditions.java src/Admin.java src/Housing.java src/Creatures.java src/Mail.java src/WorldBoss.java src/Party.java src/Duel.java src/Sex.java src/Classes.java src/Crafting.java src/Achievements.java src/BattleFix.java src/SpellGroup.java src/Clans.java src/ClanHalls.java src/Words.java src/Commands.java src/DuskServer.java
# The game loop's MP healing, fixed in the compiled engine (EnginePatch.java),
# always from the original class.
ENGINE="$GAME/DuskEngine.class"
[ -f "$GAME/storage-originals/DuskEngine.class" ] && ENGINE="$GAME/storage-originals/DuskEngine.class"
ASM="--add-exports java.base/jdk.internal.org.objectweb.asm=ALL-UNNAMED --add-exports java.base/jdk.internal.org.objectweb.asm.tree=ALL-UNNAMED"
mkdir -p tools
javac -nowarn $ASM -d tools "$SRC/EnginePatch.java"
java $ASM -cp tools EnginePatch "$ENGINE" out/DuskEngine.class
# Saving at logout, fixed in the compiled Player (PlayerPatch.java).
PLAYER="$GAME/Player.class"
[ -f "$GAME/storage-originals/Player.class" ] && PLAYER="$GAME/storage-originals/Player.class"
javac -nowarn $ASM -d tools "$SRC/PlayerPatch.java"
java $ASM -cp tools PlayerPatch "$PLAYER" out/Player.class
# Kills counting for quests, in the compiled Battle (BattlePatch.java).
BATTLE="$GAME/Battle.class"
[ -f "$GAME/storage-originals/Battle.class" ] && BATTLE="$GAME/storage-originals/Battle.class"
javac -nowarn $ASM -d tools "$SRC/BattlePatch.java"
java $ASM -cp tools BattlePatch "$BATTLE" out/Battle.class
# AC bonuses showing in the stats, in the compiled AttributeManager (AttributePatch.java).
ATTR="$GAME/AttributeManager.class"
[ -f "$GAME/storage-originals/AttributeManager.class" ] && ATTR="$GAME/storage-originals/AttributeManager.class"
javac -nowarn $ASM -d tools "$SRC/AttributePatch.java"
java $ASM -cp tools AttributePatch "$ATTR" out/AttributeManager.class
# Using an item says "use", not "eat", in the compiled LivingThing (LivingThingPatch.java).
LIVING="$GAME/LivingThing.class"
[ -f "$GAME/storage-originals/LivingThing.class" ] && LIVING="$GAME/storage-originals/LivingThing.class"
javac -nowarn $ASM -d tools "$SRC/LivingThingPatch.java"
java $ASM -cp tools LivingThingPatch "$LIVING" out/LivingThing.class
# Scripts asking whether someone wears an item by name, in the compiled Equipment (EquipmentPatch.java).
EQUIP="$GAME/Equipment.class"
[ -f "$GAME/storage-originals/Equipment.class" ] && EQUIP="$GAME/storage-originals/Equipment.class"
javac -nowarn $ASM -d tools "$SRC/EquipmentPatch.java"
java $ASM -cp tools EquipmentPatch "$EQUIP" out/Equipment.class
# Per-spell MP costs and unlocks, and spell groups readable by scripts
# (SpellPatch.java): on top of the patched LivingThing, and in the compiled
# Script. SpellGroup is compiled from server/SpellGroup.java above.
javac -nowarn $ASM -d tools "$SRC/SpellPatch.java"
java $ASM -cp tools SpellPatch living out/LivingThing.class out/LivingThing.class
# Trainers' lists without the spell schools closed to the one looking.
java $ASM -cp tools SpellPatch engine out/DuskEngine.class out/DuskEngine.class
# Props seen by some players only (a prop file's shownIf / hiddenIf flag),
# on the DuskEngine patched above (VisibilityPatch.java; Props.sees).
javac -nowarn $ASM -d tools "$SRC/VisibilityPatch.java"
java $ASM -cp tools VisibilityPatch out/DuskEngine.class out/DuskEngine.class
SCRIPT="$GAME/Script.class"
[ -f "$GAME/storage-originals/Script.class" ] && SCRIPT="$GAME/storage-originals/Script.class"
java $ASM -cp tools SpellPatch script "$SCRIPT" out/Script.class
# An NPC's question doesn't swallow the next command (TalkPatch.java), on
# the Script SpellPatch made.
javac -nowarn $ASM -d tools "$SRC/TalkPatch.java"
java $ASM -cp tools TalkPatch out/Script.class out/Script.class
ls out
