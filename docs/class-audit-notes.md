# Class system audit: findings so far (2026-10-13, Part 1 partly done; nothing changed)

Design doc: https://claude.ai/artifact/U8SyvQChVKdVA3fyRaEhkr (read; rev 14).

- Spells: defSpells/<spell> line 1 = its group; defSpellGroups/<group> lists the
  group's spells in order; defSpellGroups/"<n> <group>" = script for the n-th.
  SpellGroup.getSpellPercent: spell i of n needs group skill 100*i/(n-1).
  Trainers teach GROUPS ("train:clerical group"), not single spells, so class
  tiers apply per group unless casting changes. Priest's own list = a copied
  group (e.g. "priestly group") + trainers selling it.
- Groups in use: clerical (mend, counter poison, armor, bless), white magic
  (focus, angel strike, prayer, meditation, scan, holy), black magic (bone
  shards, curse, quake, corrupt), druidic (quarter staff, healing staff,
  thorns, camoflauge), enchantment (detect invis, invis, regenerate),
  telepathy (telepath, tire), alchemy (warp, translate, herbology), summons,
  hells fire, m group (reflect), Guardian Force; *_group duplicates look unused.
- Training: Merchant.train: cost = traincost (prefs: 10) exp x points, cap 100;
  stats via raiseStats (stre/inte/dext/cons/wisd), HP/MP via Skills.train (+10).
- Engine reads only Dodge, Double/Triple/Quadruple Attack. Our server reads
  Regeneration, Mana Regen, Spell Power (Skills.java 328/336/476), Lock
  Picking (Storage.java 192). Mana Tap, Life Tap, Armor Identification: unused.
- Old-world guild gate already exists: defMoveActions/984_975, 987_975,
  989_979, 990_975 push away anyone holding another guild's skill.
- No script, quest, item, bounty or boss grants skills/spells; only trainers.
  God: raisestat (Commands.java 1363); trainers edited via God tab merchant
  wares (god.js 88-89 madd/mremove "train:X").
- New-lands trainers (Aerendyl 496,1252; Dral 1374,925; Ithrae 1712,931;
  Hask 1471,364) teach stats/HP/MP/Dodge/Regen/Mana Regen/Spell Power only;
  every spell group is taught only in the old world (27,42; 310,160; 514,7;
  1,701; 197,906; 64,48; 693,136; 133,142; 18,36).
- New character: stats 7, HP/MP 20 (users/default); race bonuses +1..+3.
- Live (read-only totals): 27 ordinary players, median exp 0; 4 have trained
  anything; none hold a spell group.
- Client: race picker login.js 55/101, index.html 144; sex picker main.js 1862;
  Skills tab panels.js 257-275 (+SKILL_WORDS 568); Spellbook spellbook.js;
  hotbar.js; profiles from server/Admin.java. Web: faq.html, howtoplay.html.

Still to do: Part 1 (example spell lines in saves: egate on scratch has them;
where Player loads "spell"), Part 2 CSV, Part 3 proposal, Part 4 report.
