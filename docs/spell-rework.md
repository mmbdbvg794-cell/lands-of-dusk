# Spell and mana rework (2026-10-13): proposal, scratch results, what waits for approval

**Update 19:30 (the user: "remove telepath altogether, then continue"):**
- **telepath** is removed entirely: defSpells/telepath and its script go, and tire moves to slot 0 of the telepathy group, so it's learnt from the first point. The Skills.telepathMessage hook is gone too. fix_spells.py no longer writes a telepath script.
- **corrupt** gets the replacement in part 5, tested on scratch: 35 MP, 15 damage, caster healed 7, no MP back.
- **The cleanup** (part 8) is done by tools/server/spell_cleanup.py, which moves 63 files to backups/spell-cleanup-<time>/. create food/drink and meteo are deleted, as first proposed.
- **joe and bluntman** get their top-ups in tools/golive_spellmana.sh (skipped for anyone online).
- **Rehearsed on scratch,** reset from live first; everything passed. Live is backed up: ~/DuskRPG/backups/spellmana-live-20261013-192305.tar.gz.
- **Live waits for the user** to run tools/golive_spellmana.sh, then `restart 10` (the permission check blocks me from writing live).
- An engine trap found on the way: LivingThing.parseUserFile calls System.exit(0) on any error reading a user file, such as a condition with no defConditions file. Never delete defConditions files. Checked: every condition live players carry exists.

Follows docs/spell-audit.md. Everything below runs on the scratch server
(~/dusktest). **Nothing on live has changed.**

- Code: `git diff` + server/SpellPatch.java, tools/server/fix_spell_mana.py
- Game files: docs/spell-rework-gamefiles.diff (the tool's dry run against live: 45 files)

## 1. MP cost per spell

- **Where:** a second line `mp <n>` in `defSpells/<spell>`. The engine reads only line 1 (the group), in both places it opens these files (LivingThing.castSpell, DuskEngine.getSpellPercent).
- **Engine:** server/SpellPatch.java (ASM, like the other patches):
  - LivingThing.castSpell: the old `(110 - (skill - unlock)) / 2` is passed through `Skills.spellCost(sum, spell)`.
  - SpellGroup.spellList (the "5 mp) mend" lines in the stats, which both clients show) does the same, so the shown cost is what you pay.
- **No `mp` line:** the old sum stands (Skills.spellCost returns it).
- **Spell Power** still refunds, from the MP actually spent (tested: meditation 30, then 15 back at Spell Power 100).

| Group | Spell | Unlock % | Old cost when unlocked | New |
|---|---|---|---|---|
| clerical | mend | 0 | 54 | **5** |
| | counter poison (disabled) | 33 | 55 | 0 |
| | armor | 66 | 55 | 12 |
| | bless | 100 | 55 | 15 |
| white magic | focus | 0 | 54 | 12 |
| | angel strike | 20 | 55 | 10 |
| | prayer | 40 | 55 | 12 |
| | meditation | 60 | 55 | 30 |
| | scan | 80 | 55 | 6 |
| | holy | 100 | 55 | 60 |
| black magic | bone shards | 0 | 54 | **5** |
| | curse | 33 | 55 | 12 |
| | quake | 66 | 55 | 18 |
| | corrupt | 100 | 55 | 35 |
| druidic | quarter staff | 0 | 54 | **4** |
| | healing staff | 33 | 55 | 6 |
| | thorns | 66 | 55 | 10 |
| | camoflauge | 100 | 55 | 20 |
| enchantment | detect invis | 0 | 54 | 6 |
| | invis | 50 | 55 | 20 |
| | regenerate | 100 | 55 | 15 |
| telepathy | telepath | 0 | 54 | 4 |
| | tire | 100 | 55 | 15 |
| alchemy | warp | 0 | 54 | 10 |
| | translate (disabled) | 50 | 55 | 0 |
| | herbology | 100 | 55 | 10 |
| summons | summon snakes | 0 | 54 | 10 |
| | summon bahamut | 25 | 55 | 20 |
| | summon wurm | 50 | 55 | 35 |
| | summon leviathan | 75 | 55 | 45 |
| | summon ultima bahamut | 100 | 55 | 80 |
| hells fire | hell fire | 0 | 54 | 15 |
| | apocalypse | 100 | 55 | 30 |
| m group | reflect | 0 | 54 | 20 |
| Guardian Force (gods) | ifrit / shiva / leviathan / cactuar / diablos | 0-100 | 54-55 | 60 / 65 / 70 / 75 / 80 |

Tiers: starter/utility 4-6 (mend, bone shards, quarter staff, healing staff, telepath, scan, detect invis), mid 10-20, strong 30-45 (meditation, corrupt, apocalypse, wurm, leviathan), top 60-80 (holy, ultima bahamut, Guardian Force). The two disabled spells cost 0 so they don't take MP for "disabled".

## 2. Pools and regen

- **Start pool** (classes file `start ... maxmp`, on top of 20). Choosing a class now also fills the bar (Classes.java); before, it stayed at 20.
- **Regen:** the engine's 1 + WIS/2 every ~18 s out of battle stays. New: `mpregen <class> 4` in the classes file = 4% of max MP more per tick (Skills.regen, out of battle only, gods and classless excluded). A bigger bar refills in about the same time as a small one.

| Class | WIS | Pool now | New pool (delta) | Regen/tick now | New | Full bar now | New | Free spell, casts from a full bar |
|---|---|---|---|---|---|---|---|---|
| Fighter | 7 | 10 | **28** (-10 → +8) | 4 | 5 | 0.9 min | 1.8 min | (none) |
| Mage | 8 | 30 | **50** (+10 → +30) | 5 | 7 | 1.8 min | 2.4 min | bone shards: 0 → 10 |
| Cleric, Priest | 10 | 25 | **46** (+5 → +26) | 6 | 7 | 1.5 min | 2.1 min | mend: 0 → 9 |
| Ranger | 7 | 15 | **36** (-5 → +16) | 4 | 5 | 1.2 min | 2.4 min | quarter staff: 0 → 9 |
| Paladin | 9 | 18 | **40** (-2 → +20) | 5 | 6 | 1.2 min | 2.1 min | mend: 0 → 8 |

(WIS without race: human +1, elf/lizardman +2 adds up to 1 MP a tick. Fighter refills under 2 min because its bar is small; it has no free spell.)

**Casts per full bar** ("level L" as in the audit: L points in the class's groups, L-1 MP points bought; level 1 = the free starting point only).

| Class | Level | Max MP now → new | Regen/tick | Full bar | Casts per bar |
|---|---|---|---|---|---|
| Fighter | 1 | 10 → 28 | 5 | 1.8 min | no spells (cross-class mend: 5) |
| | 5 | 42 → 60 | 6 | 3.0 min | cross-class mend 12 |
| | 10 | 82 → 100 | 8 | 4.0 min | cross-class mend 20 |
| | 20 | 162 → 180 | 11 | 5.2 min | cross-class mend 36 |
| | 30 | 242 → 260 | 14 | 5.8 min | cross-class mend 52 |
| Mage | 1 | 30 → 50 | 7 | 2.4 min | bone shards 10 |
| | 5 | 78 → 98 | 8 | 4.0 min | bone shards 19, detect invis 16, snakes 9, hell fire 6 |
| | 10 | 138 → 158 | 11 | 4.6 min | bone shards 31, detect invis 26, snakes 15, hell fire 10 |
| | 20 | 258 → 278 | 16 | 5.5 min | bone shards 55, detect invis 46, snakes 27, hell fire 18 |
| | 30 | 378 → 398 | 20 | 6.1 min | bone shards 79, detect invis 66, snakes 39, bahamut 19, hell fire 26 |
| Cleric, Priest | 1 | 25 → 46 | 7 | 2.1 min | mend 9 |
| | 5 | 69 → 90 | 9 | 3.0 min | mend 18, focus 7 |
| | 10 | 124 → 145 | 11 | 4.3 min | mend 29, focus 12 |
| | 20 | 234 → 255 | 16 | 4.9 min | mend 51, focus 21, angel strike 25 |
| | 30 | 344 → 365 | 20 | 5.8 min | mend 73, focus 30, angel strike 36 |
| Ranger | 1 | 15 → 36 | 5 | 2.4 min | quarter staff 9 |
| | 5 | 51 → 72 | 6 | 3.6 min | quarter staff 18 |
| | 10 | 96 → 117 | 8 | 4.6 min | quarter staff 29 |
| | 20 | 186 → 207 | 12 | 5.5 min | quarter staff 51 |
| | 30 | 276 → 297 | 15 | 6.1 min | quarter staff 74 |
| Paladin | 1 | 18 → 40 | 6 | 2.1 min | mend 8 |
| | 5 | 58 → 80 | 8 | 3.0 min | mend 16 |
| | 10 | 108 → 130 | 10 | 4.0 min | mend 26 |
| | 20 | 208 → 230 | 14 | 5.2 min | mend 46 |
| | 30 | 308 → 330 | 18 | 5.8 min | mend 66 |

Old pools: the same rows, but every first spell cost 54-55, so level 1 was 0 casts for every class.

**Existing characters:** the start bonus applies only when a class is chosen. Two live characters have chosen one already, with the old pools: **joe** (Fighter, max MP 10) and **bluntman** (Paladin, max MP 18). Proposed: raise their max MP by the difference (joe +18 → 28, bluntman +22 → 40), editing their user files while they're logged out, with a backup. **Waiting for your OK** (it's live player data).

## 3. Healing grows with group skill

    heal = old heal x (1 + (group skill - the spell's unlock %) / 50)

x1 the moment a spell unlocks, up to x3 for mend at clerical 100 (x2 at the cross-class cap of 50). Scripts read the group through `caster skill "clerical group"`; SpellPatch makes that one script call fall back to spell groups. It used to read only skills, which is also why scan's group lines showed 0; on scratch, scan now shows "clerical group: 100".

| Spell (old heal) | Group skill | Factor | INT 9 (new character) | INT 20 |
|---|---|---|---|---|
| mend (INT x 0.5-1.0) | 1 | x1.02 | 4-9 (old 4-9) | 10-20 |
| | 25 | x1.5 | 6-13 | 15-30 |
| | 50 | x2 | 9-18 | 20-40 |
| | 100 | x3 | 13-27 | 30-60 |
| healing staff (INT x 0.5-1.5) | 33 | x1 | 4-13 | 10-30 |
| | 50 | x1.34 | 6-18 | 13-40 |
| | 100 | x2.34 | 10-31 | 23-70 |
| meditation (INT x 3.5-6.0) | 60 | x1 | 31-54 | 70-120 |
| | 80 | x1.4 | 44-75 | 98-168 |
| | 100 | x1.8 | 56-97 | 126-216 |

Regenerate (a heal over time) unlocks at 100, so it has no room to grow: unchanged.

## 4. Telepath copy to flan

On scratch: the 4 lines at the end of `defSpellGroups/0 telepathy group` are removed:

    livingthing spy player "flan"
    if variableislivingthing spy
    	chat spy concat concat concat name caster " spoke to " concat name target " saying: '" concat param1 "'."
    end

Nothing else changed. The script has no compiled .dsko, so on live the next cast uses the new file (no restart). Tested on scratch with three characters online: spmage telepathed sppal ("hi", "meet me at the docks"); sppal got both, and a scratch character named flan got nothing. The old copy (from fix_spells.py) went to flan only.

## 5. Corrupt

**Removed (scratch):**
- both `inc caster mp ...` lines (+10x (STR+INT) when a target was named, +3x otherwise)
- both "below 0 HP → set target locxy 394 394, hp 5, safe, strip buffs" blocks
- **added** `if not isinbattle caster → "You can only corrupt a foe you are fighting."`. Without the move to 394,394, an out-of-battle corrupt could leave any player in view at negative HP outside a fight: script damage can't kill, so nothing would end it.

Tested in battle: costs exactly 35 MP, no MP back, the drain lands.

**Proposed replacement (NOT applied and not yet run; waiting for approval):**

```
#Corrupt: drains a foe you are fighting: hurts it, heals you by half, and burns its mana.
if hasCondition caster "ruins"
	chat caster "Your magic 'drain' has been sealed off."
	endscript
end
if not isinbattle caster
	chat caster "You can only corrupt a foe you are fighting."
	endscript
end
number damage * + 0.8 * rand 0.6 + caster stre caster inte
inc enemy caster hp * -1 damage
inc caster hp / damage 2
inc caster damdone damage
if > enemy caster mp damage
	inc enemy caster mp * -1 damage
end
chat caster concat concat concat concat "You corrupt " name enemy caster " for " damage " damage."
chat enemy caster concat concat name caster " corrupts you for " concat damage " damage."
#Web client spell effect (dark) for everyone nearby: see js/spells.js
playsound + 150000000 + * enemy caster locx 3000 enemy caster locy enemy caster locx enemy caster locy
endscript
```

- It hits the foe you're fighting, like the other battle spells, so it works from the hotbar without a name. Today it needs `cast corrupt <name>`.
- Damage is (STR+INT) x 0.8-1.4: about 15-27 for a new mage, against wurm's 23-51 for the same 35 MP. Half of it comes back as HP.
- It burns the foe's MP only when the foe has that much (it never goes below 0), and gives the caster none.
- The drain1/drainend lockout goes; the 8 s cooldown in spellcooldowns stays.

## 6. Client: Spellbook "Needs X%"

- tools/spellinfo.py: `needs = 100 * i // (n - 1)` (0 for the first spell), as SpellGroup.getSpellPercent does.
- js/spellinfo.json rebuilt from scratch's files: 29 spells' needs changed (e.g. clerical 0/25/50/75 → 0/33/66/100).
- Seen in Chromium against scratch: the Clerical chapter shows Mend 5 MP novice, Counter Poison 0 MP 33%, Armor 12 MP 66%, Bless 15 MP 100%. White Magic shows 0/20/40/60/80/100 with 12/10/12/30/6/60 MP.
- Not deployed.

## 7. Scratch tests

Every character below was new (made by server/testclient.py). Groups beyond the free one were set in the scratch user files.

| Test | Result |
|---|---|
| Fighter (human) | pool 28/28 at creation; `cast mend`: "You don't know that spell" |
| Mage (human) | pool 50/50; stats list "5 mp) bone shards"; in battle: 5 MP, 8 damage |
| Cleric (human) | 46/46; mend x5: 46 → 41 → 36 → 31 (+1 +6 regen) → 33 → 28 |
| Priest (dark elf) | 46/46; mend x4: 5 MP each |
| Paladin (lizardman) | 40/40; mend x4: 5 MP each |
| Ranger (elf) | 36/36; quarter staff x4: 4 MP each, 4 staves |
| clerical | mend: +4/+5 at clerical 1, +19/+20/+21 at 100 (INT 9) |
| white magic | meditation: +38/+45 at 60, +56/+74 at 100; 30 MP |
| black magic | bone shards 5 MP; corrupt: 35 MP, nothing back; refused out of battle |
| druidic | quarter staff 4 MP; healing staff +3/+5 at 33, +10/+12 at 100 |
| enchantment | detect invis 6 MP |
| telepathy | telepath 4 MP; spmage → sppal with flan online: sppal got both messages, flan nothing |
| alchemy | warp 10 MP, took the mage to its bind point |
| summons | **wurm: yes, damage** (melee 4+4+3 to the 15 HP dummy, then "does40 damage", dead); **leviathan: yes** (melee 3+5, then "does35 damage", dead), 35 and 45 MP |
| hells fire | hell fire 15 MP, 8 damage |
| m group | reflect 20 MP |
| Guardian Force | ifrit 60 MP, 75 damage |
| Spell Power 100 | meditation: -30, then +15 |
| Scratch server log | no errors from the patched classes (they passed the JVM's verifier at load) |

- Wurm and leviathan work because the engine's compiler carries the rest of a line into the next statement.
- Still worth a tidy-up later: put each `inc` on its own line, and add the missing space in "does40".

**Found while testing, not changed (all older than this work):**
- reflect's script ends with `chat trigger " Reflect shield"`; a spell has no trigger, so it logs a NullPointerException (the shield still goes on). One word: `chat caster`.
- every telepath with a message logs a StringIndexOutOfBounds from the engine's Script.runScript(String): the parser steps past the closing quote that Skills.telepathMessage adds. It's caught and the message arrives; live's Script has the same code.
- the engine takes the MP before a spell's script runs. So a battle-only spell (bone shards, corrupt, the summons) cast out of battle still costs its MP and says "You must be in battle". With 5-45 MP costs this matters less than at 55. Skills.cast could refund when nothing happened, if you want.

## 8. Cleanup list (nothing deleted; for your decision)

Nobody on live holds any of these groups, no trainer teaches them, and none of their spells can be cast: castSpell needs a defSpells file that's in the group's list.

| Item | What it is | Proposed |
|---|---|---|
| defSpells/counter_poison, create_drink, create_food, detect_invis, healing_staff, quarter_staff, translation | underscore copies of real spells; not in any list, so "You don't know that spell" | delete |
| defSpells/groups | empty file | delete |
| defSpells/drain + defSpellGroups/4 black magic group | drain: not in the black magic list. The script is a holy-style hit that checks a "taco" condition | delete (corrupt is the drain) |
| defSpells/create food, create drink + 4/5 clerical group | not in the clerical list. Adding them at the end would move bless from 100% to 60% | delete; or a new "provision group" (food/drink resale was the reason they were left out) |
| defSpellGroups/clerical_group, druidic_group, enchantment_group, telepathy_group + 0_…5_ scripts, 3_druidic_gruop | old underscore copies of the real groups | delete |
| defSpellGroups/summon group, white magics group | old lists (no scripts) of summons and white magic | delete |
| defSpellGroups/3 druidic gruop, 4 druidic group | typo file and an extra script; each is just "endscript" | delete |
| god group (exp, gold) | list only, no scripts | delete |
| test group (healing, GF) | test copies of healing staff / ultima | delete |
| meteo (asteroid, comet, meteor shield, meteo) | 4 scripts: 0-450 damage, a rock shield | delete, or keep as a gods-only group like Guardian Force (needs 4 defSpells files) |
| bahamut (Bahamut, death), death (DEATH) | 999,999,999 damage "god kill" | delete |
| special group (hero's spell) | a buff script | delete |
| shifty group (weapon, armour, killer, psychopath, steal) | "isn't scripted yet", 0-200 damage, steal gold | delete |
| teleport_group | its "list" is script lines (broken) | delete |
| MTH spells (mega heal1, stone1) | list only | delete |
| Name clash: Guardian Force "leviathan" vs "summon leviathan" | different spells, both work | rename the GF one "leviathan gf"? (gods only; low priority) |

Deleting would mean moving them to backups/spell-cleanup-<time>/, with a restart after: groups are cached.

## Going live (after your approval)

All in one sitting, restart straight after (classes + heals must go in together):
1. Backup: `~/DuskRPG/backups/spellmana-live-<time>.tar.gz` (defSpells, defSpellGroups, classes, spellcooldowns, the engine classes; joe and bluntman if approved). The tool also copies each file it changes to backups/spellmana-<time>/.
2. `tools/deploy.sh` (client spellinfo.json + server sources), `server/build.sh`, `server/install.sh`.
3. `python3 fix_spell_mana.py ~/DuskRPG --apply` (45 files, the same as the dry run).
4. Restart at once: from the Proxmox host (`pct exec 303 -- systemctl restart duskserver`) or `restart 10` in the game. No god save in between.
5. Check: java start time, `stats` shows "5 mp) mend" for a cleric.

The telepath fix alone can go first, now, with no restart: `--only telepath`. The same goes for corrupt.
