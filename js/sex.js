// A character's sex (server/Sex.java). After logging in the client asks
// ("sex"); "Sex: unset" opens the picker, once, and the choice is sent as
// "sex male" or "sex female". No DOM; tested in node.

export const SEX_ASK = 'sex';
export const sexCommand = (sex) => `sex ${sex === 'female' ? 'female' : 'male'}`;

// "Sex: male" | "Sex: female" | "Sex: unset" -> the word; else null.
export function parseSex(line) {
  const m = /^Sex: (male|female|unset)$/.exec(String(line ?? '').trim());
  return m ? m[1] : null;
}

// Race image -> its female image, as on the server (players.gif).
const FEMALE = new Map([[0, 8], [1, 9], [2, 10], [6, 11]]);
const MALE = new Map([...FEMALE].map(([m, f]) => [f, m]));
export const maleImage = (image) => MALE.get(image) ?? image;
export const femaleImage = (image) => FEMALE.get(maleImage(image)) ?? image;
