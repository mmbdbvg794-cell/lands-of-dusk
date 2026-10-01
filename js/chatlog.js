// The chat's tabs: which lines are combat, and the running combat tally
// shown on the Combat tab. No DOM; tested in node.
//
// Battle.java writes its lines with a leading tab: "\tA did 5 to B, A did
// 3 to B." (a round), "\tB dodged A's attack.", "\tB is killed.", "\tYou
// get 12 gp.", "\tYou have won the battle." and so on. A few come without
// the tab ("You get 4 exp.", "You have fled from battle", "You have lost
// 3gp", "X has been killed by Y", "You got a rat tail", "-A has attacked
// B", "A is out of range.").

const UNTABBED = [
  /^You get \d+ (exp|experience|gp)\.?$/,
  /^You have fled from battle$/,
  /^You have lost \d+ ?(gp|exp)$/,
  /^.+ has been killed by .+$/,
  /^You got an? .+$/,
  /^-.+ has attacked .+$/,
  /^.+ is out of range\.$/,
  /^Players who are not in clans cannot fight other players\.$/,
];
const HIT = /^(.+?) did (\d+) to (.+)$/;
const DODGE = /^(.+?) dodged (.+)'s attack$/;

// 'combat' or 'general'.
export function chatKind(text) {
  if (/^\t\S/.test(text)) return 'combat';
  const t = text.trim();
  if (UNTABBED.some((re) => re.test(t))) return 'combat';
  return 'general';
}

// Lines that matter wherever you're looking: your death, a win, loot.
export function alsoGeneral(text) {
  return /^\t?(You have died|You have won the battle)\.?$/.test(text.trim()) || /^You got an? /.test(text.trim());
}

// The tally: kills, damage dealt and taken, dodges, exp and gold, since
// the last reset. feed(line, me) reads one line; me is your name.
export class CombatTally {
  constructor() {
    this.reset();
  }

  reset() {
    Object.assign(this, { kills: 0, deaths: 0, dealt: 0, taken: 0, hits: 0, misses: 0, dodged: 0, exp: 0, gold: 0, best: 0 });
  }

  feed(text, me) {
    const t = text.trim().replace(/\.$/, '');
    const self = (who) => !!me && who.trim().toLowerCase() === me.toLowerCase();
    let m;
    if ((m = /^You get (\d+) (exp|experience|gp)$/.exec(t))) {
      if (m[2] === 'gp') this.gold += Number(m[1]);
      else this.exp += Number(m[1]);
      return true;
    }
    if (t === 'You have died') { this.deaths++; return true; }
    if ((m = /^(.+) is killed$/.exec(t))) {
      if (!self(m[1])) this.kills++;
      return true;
    }
    let seen = false;
    for (const part of t.split(/,\s*/)) {
      if ((m = HIT.exec(part))) {
        const n = Number(m[2]);
        if (self(m[1])) {
          this.dealt += n;
          this.best = Math.max(this.best, n);
          if (n > 0) this.hits++;
          else this.misses++;
        } else if (self(m[3])) this.taken += n;
        seen = true;
      } else if ((m = DODGE.exec(part))) {
        if (self(m[1])) this.dodged++;
        else if (self(m[2])) this.misses++;
        seen = true;
      }
    }
    return seen;
  }
}
