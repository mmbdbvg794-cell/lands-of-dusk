// Logging in for the player: answers the server's name and password
// prompts (Player.class) from what was typed on the login card, and
// reports how it went. No DOM; tested in node.
//
// The server's side of it, as lines of text:
//   Enter your login name:        -> name   (Then what IS your name? after a bad one)
//   Enter your password:          -> password, then Login Accepted. or Incorrect Password.
//   <name>, Is that correct? (yes/no)   -> a new character; the player decides
//   Enter a new password: / Confirm that password: / Passwords did not match...
//                                 -> password (setting it for the new character)
//   Login Accepted.               -> in; later lines are the game's
//
// feed(text) returns what to do: { send } to answer, { confirmNew } to ask
// the player about creating a character, { done: true } once in, or
// { failed: message }. Lines it doesn't recognise return null.

const IS_THAT_CORRECT = /^(.+), Is that correct\? \(yes\/no\)$/i;

const FAILURES = [
  [/^Incorrect Password\.?$/i, 'Wrong password.'],
  [/^That account has been banned/i, 'That account is banned from this server.'],
  [/^Your IP address has been banned/i, 'Your address is banned from this server.'],
  [/^There's already a player connected from your IP address/i, 'Someone is already playing from your address.'],
];

export class LoginFlow {
  constructor(name, password) {
    this.name = name;
    this.password = password;
    this.state = 'name'; // name -> password -> (new) -> in | failed
    this.namesSent = 0;
  }

  feed(text) {
    const t = text.trim();
    if (this.state === 'in' || this.state === 'failed') return null;
    for (const [re, message] of FAILURES) {
      if (re.test(t)) return this.fail(message);
    }
    if (/^Enter your login name:?$/i.test(t) || /^Then what IS your name\??$/i.test(t)) {
      // Asked twice means the name was refused.
      if (this.namesSent > 0) return this.fail(`The server didn't accept the name "${this.name}".`);
      this.namesSent++;
      return { send: this.name };
    }
    if (/^Not a valid name/i.test(t)) return this.fail('That name can only use letters.');
    if (/^Enter your password:?$/i.test(t)) {
      this.state = 'password';
      return { send: this.password };
    }
    const m = t.match(IS_THAT_CORRECT);
    if (m) {
      this.state = 'new';
      return { confirmNew: m[1] };
    }
    if (/^Enter a new password:?$/i.test(t) || /^Confirm that password:?$/i.test(t)) return { send: this.password };
    if (/^Passwords did not match/i.test(t)) return { send: this.password };
    if (/^Login Accepted\.?$/i.test(t)) {
      this.state = 'in';
      return { done: true };
    }
    return null;
  }

  fail(message) {
    this.state = 'failed';
    return { failed: message };
  }
}

// A question the player answers yes or no, like the presence question.
export function isYesNo(text) {
  return /\(yes\/no\)\s*$/i.test(text.trim());
}
