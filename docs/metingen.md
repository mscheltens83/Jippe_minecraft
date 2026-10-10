# Metingen: hoe vlot loopt JippeCraft?

De **meetrit** laat de camera 30 seconden over een savanne met 60 dieren vliegen (vaste route,
vaste wereld, vaste beeldscherpte) en meet daarna hoe vlot het ging. Zo kun je versies en
apparaten eerlijk met elkaar vergelijken.

**Zo meet je op de iPad:** open het spel → menu → houd het versienummer onderin 3 seconden vast →
**Meetrit (30 s)**. Maak na afloop een schermafbeelding of tik op **Kopieer** en plak de regel
hieronder in de tabel. (Op een computer kan ook: `?meet` achter het adres.)

Na elke fase komt er een regel bij. Volgens het plan mag de meetrit per fase hoogstens 15%
langzamer worden (§13 van [`fase-4-plan.md`](fase-4-plan.md)).

| Kolom | Betekenis |
|---|---|
| fps | Gemiddeld aantal beelden per seconde (doel op de iPad: 60, minimaal 40) |
| p50 / p95 / traagst | Hoe lang een gewoon beeldje, de traagste 5% en het allertraagste beeldje duurden, in milliseconden (16,7 ms = 60 fps; 25 ms = 40 fps) |
| tekenopdrachten | Hoeveel losse stukken de beeldkaart per beeldje moet tekenen (gemiddeld en hoogstens) |
| driehoeken | Hoeveel driehoekjes er per beeldje getekend worden |

## iPad

| Datum | Versie | Apparaat | Beeldkaart | Duur | fps | p50 ms | p95 ms | traagst ms | tekenopdrachten | driehoeken | scherpte · beeld |
|---|---|---|---|---|---|---|---|---|---|---|---|
| *nog te meten* | 4.0.0 | | | | | | | | | | |

## Testcomputer (in de cloud, **zonder videokaart**)

De testcomputer tekent met software (SwiftShader). De fps zegt daarom niets over de iPad, maar
de cijfers zijn wel goed om versies met elkaar te vergelijken: komen er tekenopdrachten of
driehoeken bij, of wordt het trager?

| Datum | Versie | Apparaat | Beeldkaart | Duur | fps | p50 ms | p95 ms | traagst ms | tekenopdrachten | driehoeken | scherpte · beeld |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-10 07:00 | 4.0.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 9,7 | 100 | 183,4 | 216,8 | 471 (max 553) | 81.003 | 1,5 · 1791×1251 |
| 2026-10-10 07:01 | 4.0.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 9,4 | 100 | 199,9 | 233,3 | 494 (max 552) | 82.276 | 1,5 · 1791×1251 |

## Wat opvalt (nulmeting 4.0.0)

- **De dieren zijn het duurst om te tekenen.** Op de route van de meetrit zijn het ±490
  tekenopdrachten met 60 dieren, en **120 zonder dieren**. Elk dier bestaat uit ±9 losse stukjes
  (lijf, kop, 4 poten, staart, ...) die elk apart getekend worden. Het plan mikt op hoogstens 300.
  Oplossing voor later: de stukjes van een dier dat ver weg staat samenvoegen tot één geheel, of
  dieren van dezelfde soort in één keer tekenen (*instancing*). Hoort bij 4B (zichtafstand en
  tekenbudget) en 4G (meer dieren).
- Het landschap (36 chunks met zee, lucht en wolken) kost ±120 tekenopdrachten en ±58.000 driehoeken.
  Dat is voor een iPad weinig.
- Rekenwerk per beeldje (cpu) is laag: 3–7 ms op de testcomputer. De beeldkaart is de grens.
