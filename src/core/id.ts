/**
 * UUID v4 — `Foundation.UUID()`-ის შემცვლელი.
 *
 * `crypto.randomUUID` Hermes-ზე ყველა ვერსიაში არ არსებობს, `expo-crypto`
 * კი ერთი ერთეულისთვის ზედმეტი დამოკიდებულებაა. მოთამაშის იდენტიფიკატორი
 * კრიპტოგრაფიულად მნიშვნელოვანი არაა — უნიკალურობა კმარა.
 */
export function uuid(): string {
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else if (i === 19) out += ((Math.random() * 4) | 8).toString(16);
    else out += ((Math.random() * 16) | 0).toString(16);
  }
  return out;
}
