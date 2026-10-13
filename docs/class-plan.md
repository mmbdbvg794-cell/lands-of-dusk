# Dusk class system: audit and plan (2026-10-13)

Nothing in the game has been changed. Inventory: docs/class-inventory.csv (73 rows). Raw notes: docs/class-audit-notes.md.

## 1. How it works today
- Spells: defSpells/<spell> (line 1 = group); defSpellGroups/<group> lists spells in order; "defSpellGroups/<n> <group>" is the script. Spell i of n needs 100*i/(n-1) % of the group (SpellGroup.getSpellPercent).
- Learning: only trainers. Merchant ware `train:X` -> Skills.train (server/Skills.java:51) -> Merchant.train -> LivingThing.learnSkill (decompiled LivingThing:178): spell group if findSpellGroupFile finds one (addToSpell, spellTable :59/:355), else addToSkill. Cost = traincost (10) x points, cap 100. HP/MP: +10 per point (Skills.java:51-68).
- No quest, script, item, bounty or world boss grants or checks a skill or spell. Crafting skills grow by use (Crafting.java:477) and are checked at sources (:318, :355).
- Only existing skill checks: guild gates defMoveActions 984_975, 987_975, 989_979, 990_975.
- Skills the server reads: engine Dodge, Double/Triple/Quadruple Attack; ours Regeneration (Skills.java:328), Mana Regen (:336), Spell Power (:476), Lock Picking (Storage.java:192). Mana Tap, Life Tap, Armor Identification are read by nothing.
- Save file: race, stats (stre inte dext cons wisd), hp/maxhp/mp/maxmp, `skill/name/level`, `spell/group/level`, conditions (4 lines). Sex is a hidden condition `female`/`male` (server/Sex.java). No class field exists.
- Clients: browser race picker js/login.js:55/101 + index.html:144; sex picker js/main.js:1862; Skills tab js/panels.js:257-275; spellbook js/spellbook.js (data js/spellinfo.json); hotbar js/hotbar.js; profiles server/Admin.java. Java client: text race prompt, stats panel prints skills and "-Spells-" (LivingThing:1488).
- God tools: madd/mremove trainer wares (js/god.js:88-89), raisestat (Commands.java:1363), setsex.
- Velkarath / Deep Patrol: no trainer, quest or talk assumes drow learn Cleric/holy spells. Weaponmaster Dral teaches stats/HP/MP/Dodge/regen/Spell Power only. Priestess Ilvra's "mark" is a condition, not a spell. dp_ember, dp_lostpatrol, dp_slime and iz_deep need no skill or spell.

## 2. Proposal
### Storage and trainer check
- A hidden condition `class_<id>` like the sex flag, and a new file `classes` (server data, god-editable):
  ```
  multiplier 2            # cross-class price
  crosscap 50             # cross-class max points
  class fighter  Fighter
  class mage     Mage
  class cleric   Cleric           races: -darkelf
  class priest   Priest|Priestess races: darkelf   copyof cleric
  class rogue    Rogue            (or Ranger)
  class paladin  Paladin          (optional)
  core fighter   Dodge, Double Attack, Triple Attack, Quadruple Attack
  barred mage    white magic group, clerical group, Double Attack, ...
  open           Regeneration, Mana Regen, Strength, ..., alchemy group
  ```
- Skills.train looks up the ware: open or core = normal price and cap 100; other class's = price x multiplier, cap crosscap; barred = refused with a line saying why. Trainers keep their wares; the merchant list shows the class price.
- Priest is its own class id: its core list is a copy of Cleric's today, edited separately later. Display name picks Priest/Priestess from the `female` flag.
- Own Priest spell list later: new defSpellGroups/"dark prayers group" + defSpells entries, add `train:dark prayers group` to Velkarath trainers, move it to `core priest`; spellbook needs only a regenerated js/spellinfo.json (tools/spellinfo.py).

### Stats and growth (based on: start stats 7 all, HP/MP 20, +10 HP/MP per trained point at 10 exp, damage = attacker/2 x (rand+0.5) x damMod/100 - armor; monster HP: Fallen 50, magma slime 130, Ashen Gaoler 900, Morvane 1200; live median exp 0, most players maxhp 20)
| class | start bonus | start HP/MP | HP / MP per trained point |
|---|---|---|---|
| Fighter | STR+3 CON+1 | 30/10 | 12 / 8 |
| Mage | INT+3 WIS+1 | 15/30 | 8 / 12 |
| Cleric, Priest | WIS+3 INT+1 | 22/25 | 10 / 11 |
| Rogue/Ranger | DEX+3 STR+1 | 25/15 | 11 / 9 |
| Paladin | STR+2 WIS+2 | 27/18 | 11 / 10 |
All in the `classes` file. Applied at creation and once at class pick (for existing characters too, as a small bonus).

### Armor and weapons
- Items only say weapon / ranged / armor, no sub-kind. Add a `classgear` file mapping item -> heavy armor / light armor / blade / blunt / staff / dagger / bow, pre-filled by name (sword, axe, plate, mail, robe, staff, dagger, bow) and reviewed by hand.
- Rules: Fighter/Paladin anything; Cleric/Priest no blades; Mage staff/dagger, light armor only; Rogue light armor, no two-handed axes.
- Enforce in the wear/wield command (Commands via patch.py): refuse with a message. Never strip worn gear: items already worn at migration stay until removed.

### Migration
- At login, anyone without `class_*` gets the class picker (like the sex picker: browser dialog; Java text prompt "Pick a class: fighter, mage, ..." answered with `class <name>`). Free, once; gods change it with `setclass`.
- Everything already learned stays. Over-cap cross-class points are kept, not cut.
- Never picks: "Unclassed": open skills only at normal price, everything else cross-class price, reminder each login.

### Quest check
- No quest chain, bounty, script, item or boss requires a skill or spell, so no class is locked out of any content. Guild gates: a Mage with Lock Picking would be pushed out of the Mage guild door; replace the four gate scripts with class checks or remove them.
- Crafting skill checks stay Open.

### Client and page changes
- Creation: browser login.js/index.html adds a class step after race (Priest/Priestess shown only for dark elves, Cleric hidden for them); Java client text prompt.
- Skills tab and spellbook: tag Core / Other class (x2, cap 50) / Open; merchant list shows the class price.
- Profile (Admin.java + profile page): show the class.
- Help page, howtoplay.html, faq.html, Java help: a Classes section.

### Steps
1. Back up users/ and data files on live (tar into backups/).
2. Write `classes` + `classgear`, Skills.train check, `class`/`setclass` commands, login picker, wear check. Build.
3. Test on scratch (tools/scratch.sh): each class at each trainer (price, cap, barred), drow Priest/Priestess by sex, picker in both clients, an old saved character keeping its skills.
4. Client and pages; tests in node.
5. Live: backup again, install + restart at once, watch logs and the first logins.
6. Later: Priest spell list, gear tuning.

## 3. Risks
- Gaps: Rogue/Ranger has only Lock Picking + druidic; no stealth, archery or backstab skill. Paladin has no own spells. Fighter has no defensive/taunt skill. Priest has no dark-themed spells. Mana Tap, Life Tap and Armor Identification do nothing.
- Spells are trained by group: one holy spell can't be locked without splitting its group.
- New class files mean installing server classes; install and restart must go together.
- Gear names are inconsistent (duplicates like broad sword / broad_sword); the gear map needs a hand review.
- Old-world trainers sell everything everywhere; with the multiplier, unclassed or off-class players pay more and may complain.

## 4. Decisions (2026-10-13)
1. Mage: holy (clerical, white magic) and fighting skills (Dodge, Double/Triple/Quadruple Attack) are barred, not cross-class. Mage balance: staff/dagger only, starts with a free point in black magic (bone shards) and a quarter staff; see the numbers below.
2. Classes: Fighter, Mage, Cleric, Priest/Priestess (drow), Ranger, Paladin. No Rogue for now; Lock Picking is Ranger core until a Rogue exists. Paladin gets its own spells later.
3. multiplier 2, crosscap 50, stat/HP tables as proposed (for now).
4. Forced pick at login (no play until picked). On pick, off-class skills and spell groups are removed (all existing characters are the owner's test characters); exp spent on them is refunded.
5. Guild doors: replaced by class checks (Mage Guild = Mage, Healer Guild = Cleric/Priest/Paladin, Thieves Guild = Ranger).
6. Gear: hard block.
7. Existing characters get the class starting bonus when they pick.

Mage balance numbers: melee = STR/2 x (0.5..1.5) x weapon mod/100 - armor (Battle.java damRoll). Bone shards = (0.3..0.6) x (STR+INT), no weapon needed, 3 s cooldown (spellcooldowns).
- Fresh Mage (STR 7, INT 10), quarter staff (mod 115): melee ~4 per hit; bone shards ~7.
- Fresh Fighter (STR 10), long sword (mod 150): ~7.5 per hit, plus Double Attack later.
So a starting Mage's spell matches a Fighter's sword, and the staff is a backup when MP runs out.
Every class gets a free starter: Mage black magic 1, Cleric/Priest clerical 1 (mend), Paladin clerical 1, Ranger druidic 1 (quarter staff), Fighter Dodge 5.
