/** ხელმისაწვდომი სიგანე ტექსტის მასშტაბთან ერთად განსაზღვრავს სიმჭიდროვეს.
 * ზომები RN-ის ლოგიკურ ერთეულებშია: iOS pt / Android dp, არა სქრინშოტის px.
 * შრიფტს არ ვამცირებთ — ვათავისუფლებთ ადგილს სვეტებისა და რიგების შეცვლით.
 */
export function needsSingleColumn(width: number, fontScale: number): boolean {
  return width / Math.max(1, fontScale) < 320;
}
