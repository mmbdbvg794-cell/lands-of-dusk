# Spell and mana audit (2026-10-13, read-only)

Tables (made by `tools/spell_audit.py` from the live game's files; nothing was changed):
- `docs/spell-audit-spells.csv`: every spell, its group, unlock %, price, MP cost, effect, numbers, duration, cooldown, trainers, and for each class whether it can learn it and what it costs against their pool when it unlocks.
- `docs/spell-audit-mp-by-level.csv`: each class at "levels" 1, 5, 10, 20, 30: max MP, regen, and casts from a full bar per spell.
- `docs/spell-audit-mend.csv`: mend (the "cure") for each class that can learn it.

## How it works today

**MP cost** (engine `LivingThing.castSpell`, `SpellGroup.spellList`), the same formula for every spell:

    cost = (110 - (group skill - spell's unlock %)) / 2      (integer)

- Every spell costs **55 MP the moment it unlocks** (54 with one point over), whatever it does.
- It only gets cheaper as the group is trained further: 30 MP at 50 points above, 5 MP at the best (group 100, a spell that unlocks at 0).
- There is no per-spell cost, and no per-class or per-level cost.
- Spell Power (server/Skills.java `cast`) refunds cost × power / 200 afterwards. At 100 power that's half back, but the full cost must be there first.

**Unlock %** (engine `SpellGroup.getSpellPercent`): the spell at position i of n needs 100 × i / (n − 1) points in its group. So the last spell of every group needs **100**, the maximum. That applies to bless, holy, corrupt, camoflauge, regenerate, tire, herbology, ultima bahamut and apocalypse.

**Price**: 10 exp per group point (traincost). Unlocking a spell at x% costs x × 10 exp, or double for another class's group, which also stops at 50.

**Max MP**:
- Starts at 20 + the class delta: Fighter 10, Mage 30, Cleric/Priest 25, Ranger 15, Paladin 18.
- Each MP point bought at a trainer adds the class's growth: 8 / 12 / 11 / 11 / 9 / 10 (Classes.growth, server/Skills.java `train`).
- **There is nothing else.** No levels, and WIS doesn't raise max MP.

**MP regen**:
- The engine loop (DuskEngine.run, every 73rd pass of 250 ms, about every 18 s) gives players who are **not in battle** 1 + WIS/2 awake, or 3 + WIS asleep.
- The result is capped at max MP + bonuses. Our EnginePatch fixed the old CON / max HP mix-up.
- Mana Regen adds up to the same again at 100, halved in battle (Skills.regen).
- Conditions (buff durations) tick once a second (server/Conditions.java), so "INT × 6" means INT × 6 seconds.

**Levels: Dusk has none.** Players progress by spending exp at trainers. For the level table, "level L" means:
- L points in the class's school(s); level 1 is a fresh character with the class's free starting point,
- L − 1 MP points bought,
- WIS 7 + the class bonus, with no race bonus counted (human +1, elf +2, lizardman +2).

## What the numbers show

| Class | Lv1 MP | Lv5 | Lv10 | Lv20 | Lv30 | Regen per tick, awake / asleep |
|---|---|---|---|---|---|---|
| Fighter | 10 | 42 | 82 | 162 | 242 | 4 / 10 |
| Mage | 30 | 78 | 138 | 258 | 378 | 5 / 11 |
| Cleric, Priest | 25 | 69 | 124 | 234 | 344 | 6 / 13 |
| Ranger | 15 | 51 | 96 | 186 | 276 | 4 / 10 |
| Paladin | 18 | 58 | 108 | 208 | 308 | 5 / 12 |

- **No class can cast its first spell at level 1.** Every first spell costs 54 against a pool of 10 to 30.
  - Mage's bone shards: 54 of 30. Cleric's mend: 54 of 25. Ranger's quarter staff: 54 of 15.
  - That includes the free starting spells I gave each class.
- **At level 5** every first spell takes over 20% of the pool: 52 MP, one cast from a full bar. A Ranger still can't cast quarter staff: 52 of 51.
- **Every spell's first cast is the most expensive one.** A new spell always costs 55, so learning it at a higher level doesn't make it "fit". The cost only falls as the group goes past the unlock point.
- **Regen is slow.** A level 1 Cleric gets 6 MP per 18 s, so it takes 9 ticks (about 3 minutes, out of battle) to reach the 54 that mend needs, and the pool is only 25 anyway.

## The "cure" (mend): why 54 MP for a low-level Paladin

There is no spell called cure. The cheap heal is **mend**, the first spell of the clerical group.
- A Paladin starts with 1 point of clerical, so cost = (110 − (1 − 0)) / 2 = **54**.
- The Paladin's pool is 18, so it **can't be cast at all**.
- It heals INT × 0.5–1.0, which is 3–7 HP for a Paladin (INT 7). That's about 0.1 HP per MP.

| Class | Tier | At clerical 1 | At 10 | At 50 | At 100 |
|---|---|---|---|---|---|
| Cleric, Priest | core | 54 MP, pool 25, 0 casts | 50 MP, 2 casts | 30 MP, 18 casts | 5 MP |
| Paladin | core | 54 MP, pool 18, 0 casts | 50 MP, 2 casts | 30 MP, 16 casts | 5 MP |
| Fighter | other class (×2, max 50) | 54 MP, pool 10, 0 casts | 50, 1 cast | 30 (stops here) | — |
| Ranger | other class (×2, max 50) | 54 MP, pool 15, 0 casts | 50, 1 cast | 30 (stops here) | — |
| Mage | barred | — | — | — | — |

The heal never improves with group skill, only the cost does: INT × 0.5–1.0 at every level.

## Spell groups today, and what depends on them

Groups (the "schools"), each a file listing its spells in order:

| Group | Spells |
|---|---|
| clerical | mend, counter poison, armor, bless |
| white magic | focus, angel strike, prayer, meditation, scan, holy |
| black magic | bone shards, curse, quake, corrupt |
| druidic | quarter staff, healing staff, thorns, camoflauge |
| enchantment | detect invis, invis, regenerate |
| telepathy | telepath, tire |
| alchemy | warp, translate, herbology |
| summons | snakes, bahamut, wurm, leviathan, ultima bahamut |
| hells fire | hell fire, apocalypse |
| m group | reflect |
| Guardian Force | ifrit, shiva, leviathan, cactuar, diablos |

What depends on them:
- **Engine:** `defSpells/<spell>` line 1 names the group, and `defSpellGroups/<group>` gives the order, which sets the unlock % and the cost. `defSpellGroups/"<n> <group>"` is the script, and the engine runs its compiled `.dsko` when one exists. Groups are cached at first use, so a change to a group's list needs a restart.
- **Trainers** (`merchants`, `train:<group>`): clerical ×3, druidic ×3, enchantment ×3, alchemy ×2, black ×2, white ×2, and summons, telepathy, hells fire and m group ×1 each.
- **Classes** (`DuskRPG/classes`, server/Classes.java): the core, barred and open lists name groups.
- **server/Skills.java:** `cast` (cooldowns by spell name from `spellcooldowns`, the Spell Power refund) and `telepathMessage`.
- **The scan spell** reads each group by name as a *skill*.
- **Conditions** the spells give: armor, bless, focus, cursed, tired, hpregen, invis, detect invis, reflect, plus `scripts/*start|end|tick` and `conf/canSeeLivingThing` (detect invis).
- **Browser client:**
  - `js/spellinfo.json` (built by tools/spellinfo.py)
  - `js/spellbook.js` (chapters by group, class tags)
  - `js/spells.js` (effect kinds by spell name)
  - `js/hotbar.js`
  - `js/panels.js` (the Skills tab hides "… group")
  - `js/classes.js`
- **Quests, items, monsters:** none cast a spell or need one. Monsters have a spell table but never cast. `book`, `spell book` and `tome` are plain items, and `commands/cast` is disabled.

## Flags

**Do nothing:**
- counter poison and translate (both print "disabled").
- reflect, except that curse and thorns check it.
- holy checks a "taco" condition that doesn't exist.
- scan's spell-group lines always show 0.

**Probably broken:**
- summon wurm and summon leviathan: the damage formula and "inc enemy … hp" are on one line, so they may deal no damage. Needs a test on scratch.

**Unbalanced:**
- **corrupt** gives the caster 10 × (STR + INT) MP out of battle (3× in battle), far more than its 55 cost, so it's an MP engine. It can also send a player target to 394,394 ("hell").
- **prayer** also cures hunger and thirst.
- **herbology** duplicates the Alchemy crafting skill.
- **ultima bahamut** costs 100 exp per cast.

**Privacy:**
- **telepath** copies every message to the player **flan**.

**Unreachable:**
- **Never in any group list, so they can never be cast:** `drain`, `create food`, `create drink`.
- **Scripts with no spell in the list:** `5 clerical group` (Create Food) and `4 clerical group`, extra scripts past the 4 listed spells.
- **Guardian Force:** taught by nobody (god-granted only).
- **Spells that unlock above 50 can't be reached by another class, which stops at 50:** armor, bless, quake, corrupt, thorns, camoflauge, meditation, scan, holy, leviathan, ultima, regenerate, apocalypse.
- **Spells that unlock at 100:** they need the maximum skill, which takes 1,000 exp of training.

**Duplicates and leftovers:**
- **Underscore spell files:** counter_poison, create_drink, create_food, detect_invis, healing_staff, quarter_staff, translation.
- **Duplicate groups:** clerical_group, druidic_group, enchantment_group, telepathy_group, summon group, white magics group, plus `0_…`/`4_…` underscore scripts and a typo, `3 druidic gruop`.
- **Name clash:** "leviathan" (Guardian Force) vs "summon leviathan".
- **Test and god groups:** god, test, meteo, bahamut, death, special, shifty, teleport_group, MTH.
- An empty `groups` spell file.

**Client mismatch:**
- tools/spellinfo.py computes "needs" as 100 × i / n (0/25/50/75) instead of the engine's 100 × i / (n − 1) (0/33/66/100).
- So the Spellbook's "Needs X%" is wrong for every group except white magic's last spell and single-spell groups.

**My own class settings made it worse:**
- **Fighter, Ranger and Paladin start below 20 MP**, and the free starting spells (Mage bone shards, Cleric/Priest/Paladin mend, Ranger quarter staff) are unusable until about 5 MP points are bought.
