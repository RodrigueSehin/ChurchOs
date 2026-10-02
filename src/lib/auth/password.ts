import "server-only";
import { randomInt } from "node:crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sans I, O (ambigus)
const LOWER = "abcdefghijkmnpqrstuvwxyz"; // sans l, o
const DIGITS = "23456789"; // sans 0, 1
const SPECIAL = "!@#$%&*?+-=";
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

const pick = (chars: string) => chars[randomInt(chars.length)]!;

/**
 * Mot de passe temporaire aléatoire (CSPRNG) qui respecte la politique de l'application (8+ caractères,
 * majuscule, minuscule, chiffre, caractère spécial) ; les caractères ambigus (0/O, 1/l/I) sont exclus pour
 * qu'il soit recopiable sans erreur.
 */
export function generateTempPassword(length = 14): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
