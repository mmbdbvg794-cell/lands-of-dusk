// The god commands, for the God tab's reference: what to type, what it
// does, and the god level it needs (a character's privs: 3 for a god, up
// to 5). From the server's Commands.adminCommands and our own additions
// (server/Storage.java, Props.java, Talk.java). Most are also buttons in
// the God tab; this is the full list.

export const GOD_COMMANDS = [
  // Getting around and seeing
  { group: 'Getting around', use: 'teleport <x> <y>', desc: 'Jump to a place.', level: 3 },
  { group: 'Getting around', use: 'teleport <player>', desc: 'Jump to a player.', level: 3 },
  { group: 'Getting around', use: 'callplayer <player>', desc: 'Bring a player to you.', level: 3 },
  { group: 'Getting around', use: 'wizinvis on', desc: 'Hide from players (wizinvis off to show again).', level: 3 },
  { group: 'Getting around', use: 'activemobs', desc: 'How many creatures are active right now.', level: 3 },

  // Players
  { group: 'Players', use: 'whois <player>', desc: 'Who someone is: account, address, level.', level: 3 },
  { group: 'Players', use: 'playtime <player>', desc: 'How long someone has played.', level: 3 },
  { group: 'Players', use: 'loginhistory <player>', desc: 'When and where someone logged in from.', level: 3 },
  { group: 'Players', use: 'kickplayer <player>', desc: 'Disconnect a player.', level: 3 },
  { group: 'Players', use: 'boot <player>', desc: 'Throw a player out of your clan area / disconnect.', level: 3 },
  { group: 'Players', use: 'mute <player>', desc: 'Stop a player chatting (unmute <player> to undo).', level: 3 },
  { group: 'Players', use: 'nochannel <player> <minutes>', desc: 'Keep a player off the chat channel for a while.', level: 3 },
  { group: 'Players', use: 'allowchannel <player>', desc: 'Let them back on the channel.', level: 3 },
  { group: 'Players', use: 'ban <player>', desc: 'Ban an account, and if they\'re online their address and device too (unban <player> lifts all three).', level: 3 },
  { group: 'Players', use: 'banip <address or player>', desc: 'Ban an address, or the one an online player is on (unbanip <address> to undo).', level: 3 },
  { group: 'Players', use: 'bandevice <player>', desc: 'Ban the browser an online player is using (unbandevice <id> to undo).', level: 3 },
  { group: 'Players', use: 'bans', desc: 'Every banned account, address and device.', level: 3 },
  { group: 'Players', use: 'changerace <player> <race>', desc: 'Turn a player into another race.', level: 3 },
  { group: 'Players', use: 'changeclan <player> <clan>', desc: "Put a player in a clan ('none' to take them out).", level: 3 },
  { group: 'Players', use: 'clanleader <player>', desc: 'Make a player their clan\'s leader.', level: 3 },
  { group: 'Players', use: 'clearconditions <player>', desc: 'Remove every condition (and quest flag) from a player.', level: 4 },
  { group: 'Players', use: 'removeskill <player> <skill>', desc: 'Take a skill or spell away.', level: 4 },
  { group: 'Players', use: 'raisestat <player> <stat> <amount>', desc: 'Raise a stat (str, int, dex, con, wis, hp, mp...).', level: 4 },
  { group: 'Players', use: 'makegod <player> <level>', desc: 'Make someone a god (0 to make them a player again).', level: 5 },

  // Talking to everyone
  { group: 'Messages', use: 'announce <message>', desc: 'A message to everyone online.', level: 5 },
  { group: 'Messages', use: 'gecho <message>', desc: 'Echo a line to everyone, without your name.', level: 3 },

  // Building the world
  { group: 'Building', use: '<<item>', desc: 'An item on your square (e.g. <red potion).', level: 3 },
  { group: 'Building', use: '<<mob> lev: <level>', desc: 'A creature on your square (level optional).', level: 3 },
  { group: 'Building', use: '<prop <name>', desc: 'A prop on your square.', level: 3 },
  { group: 'Building', use: 'nameprop <prop>|<name>|<description>', desc: 'A prop with a name (and description) of its own.', level: 3 },
  { group: 'Building', use: 'propdesc <id>|<text>', desc: 'What Look says about a prop.', level: 3 },
  { group: 'Building', use: '<sign <text>', desc: 'A sign on your square.', level: 3 },
  { group: 'Building', use: 'namesign <name>|<text>', desc: 'A sign with a name, e.g. Bank.', level: 3 },
  { group: 'Building', use: 'signname <id>|<name>', desc: 'Rename a sign.', level: 3 },
  { group: 'Building', use: 'signtext <id>|<text>', desc: 'Change what a sign says.', level: 3 },
  { group: 'Building', use: '<merchant <name>', desc: 'A merchant on your square.', level: 3 },
  { group: 'Building', use: 'madd <item>', desc: 'The merchant you stand on sells this too.', level: 3 },
  { group: 'Building', use: 'mremove <item>', desc: 'The merchant you stand on stops selling it.', level: 3 },
  { group: 'Building', use: '><tile>', desc: 'Change the ground tile under you to this number.', level: 3 },
  { group: 'Building', use: 'unset <id>', desc: 'Remove a creature, item, prop, sign, merchant or door.', level: 3 },
  { group: 'Building', use: 'storage place barrel <label>', desc: 'Shared storage on your square (or chest).', level: 5 },
  { group: 'Building', use: 'storage remove', desc: 'Remove the empty storage on your square.', level: 5 },
  { group: 'Building', use: 'storage list', desc: 'Every storage and how full it is.', level: 5 },
  { group: 'Building', use: 'storage lock <key item>', desc: 'Lock the chest next to you: it opens only for someone carrying that item (storage unlock to undo).', level: 5 },
  { group: 'Building', use: 'tilemsg <speaker>|<text>', desc: 'A message for whoever steps on your square (the Tile action editor does more).', level: 3 },
  { group: 'Building', use: 'tilemsg clear', desc: "Remove your square's message or tile action.", level: 3 },
  { group: 'Building', use: '<s', desc: 'Save the map: tiles, mobs, props, signs, merchants.', level: 3 },

  // Game files
  { group: 'Game files', use: 'list items', desc: 'All items (also mobs, props, races, pets, conditions, scripts, commands, conf).', level: 3 },
  { group: 'Game files', use: 'view item <name>', desc: "Open a game file to edit (item, mob, prop, race, condition, script, command...).", level: 3 },
  { group: 'Game files', use: 'delete item <name>', desc: 'Delete a game file.', level: 3 },
  { group: 'Game files', use: 'checkmoveactions', desc: 'Check the walk-on scripts for problems.', level: 3 },
  { group: 'Game files', use: 'checkmerchants', desc: "Find merchants selling things that don't exist.", level: 3 },

  // The server
  { group: 'Server', use: 'save', desc: 'Save the game settings and map.', level: 3 },
  { group: 'Server', use: 'backup', desc: 'Back up the map.', level: 3 },
  { group: 'Server', use: 'reloadprefs', desc: 'Reload conf/prefs without restarting.', level: 5 },
  { group: 'Server', use: 'shutdown <seconds>', desc: 'Warn everyone, save them, and stop the server (it needs starting again).', level: 5 },
];

// The part to type before filling in the rest: "teleport ", "<", "nameprop ".
export function commandStart(use) {
  if (use.startsWith('<<')) return '<';
  if (use.startsWith('><')) return '>';
  const i = use.slice(1).search(/<[a-z]/); // after a leading "<" of its own
  return i >= 0 ? use.slice(0, i + 1) : use;
}
