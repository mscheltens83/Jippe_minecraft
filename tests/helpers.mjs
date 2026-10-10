// Hulpjes voor de browsertests. De test-browser tekent zonder videokaart en is dus traag:
// na een tik wachten we tot het spel hem verwerkt heeft, nooit een vaste pauze.

// Wacht tot `fn` (in de browser) waar is; geeft true of false terug in plaats van een fout
export function waitTrue(page, fn, arg, timeout = 8000) {
  return page.waitForFunction(fn, arg, { timeout }).then(() => true, () => false);
}

// Tik met een vinger op (x, y) en wacht tot `fn` waar is. Een tik op het spelbeeld wordt pas
// in het volgende beeldje verwerkt, dus direct controleren is te vroeg.
export async function tapAndWait(page, x, y, fn, arg, timeout = 8000) {
  await page.touchscreen.tap(x, y);
  return waitTrue(page, fn, arg, timeout);
}
