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
| 2026-10-10 10:55 | 4.1.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 7,0 | 149,9 | 266,6 | 333,3 | 262 (max 340) | 118.745 | 1,5 · 1791×1251 |
| 2026-10-10 10:56 | 4.1.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 6,9 | 149,9 | 250 | 350 | 271 (max 370) | 119.094 | 1,5 · 1791×1251 |
| 2026-10-10 12:49 | 4.2.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 4,2 | 233,3 | 466,6 | 600 | 410 (max 484) | 350.615 | 1,5 · 1791×1251 |
| 2026-10-10 12:50 | 4.3.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 4,0 | 233,3 | 516,6 | 583,4 | 410 (max 489) | 352.960 | 1,5 · 1791×1251 |
| 2026-10-10 13:55 | 4.3.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 3,9 | 249,9 | 499,9 | 650 | 427 (max 503) | 351.360 | 1,5 · 1791×1251 |
| 2026-10-10 13:58 | 4.3.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 3,7 | 266,6 | 566,7 | 700 | 404 (max 487) | 349.846 | 1,5 · 1791×1251 |
| 2026-10-10 14:04 | 4.4.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 3,6 | 266,7 | 566,6 | 900 | 417 (max 476) | 353.515 | 1,5 · 1791×1251 |
| 2026-10-10 14:05 | 4.4.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 3,7 | 250,1 | 583,2 | 733,4 | 420 (max 476) | 351.333 | 1,5 · 1791×1251 |
| 2026-10-10 16:51 | 4.5.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 3,8 | 266,6 | 550 | 649,9 | 406 (max 477) | 352.092 | 1,5 · 1791×1251 |
| 2026-10-10 16:53 | 4.5.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 4,1 | 250 | 466,6 | 783,3 | 409 (max 495) | 348.734 | 1,5 · 1791×1251 |
| 2026-10-10 16:52 | 4.6.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 4,0 | 249,9 | 483,4 | 900 | 412 (max 482) | 350.409 | 1,5 · 1791×1251 |
| 2026-10-10 16:54 | 4.6.0 | Testcomputer (nagebootste iPad Pro 11) | SwiftShader (software) | 30 s | 3,9 | 250 | 550 | 683,3 | 406 (max 490) | 348.792 | 1,5 · 1791×1251 |

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

## Wat opvalt (4.1.0, eindeloze wereld)

- **Tekenopdrachten gehalveerd: ±490 → ±265** (doel was hoogstens 300). Dieren verder dan ±28 blokken
  worden nu als één stuk getekend in plaats van ±9 losse stukjes. Het landschap is per chunk samengevoegd
  tot hoogstens 4 tekenopdrachten (dicht, gaatjes, glas, water).
- **Driehoeken: 81.000 → 119.000.** Je ziet veel meer wereld: de meetrit kijkt nu 6 chunks (±100 blokken)
  ver in een wereld die doorloopt, in plaats van over één eiland van 96 × 96.
- **Op de testcomputer 9,5 → 7,0 fps.** Software-tekenen (zonder videokaart) heeft vooral last van
  driehoeken en pixels; dat is ook waarom het iets trager is, niet door het rekenwerk (cpu bleef laag).
  Op een echte iPad tellen de tekenopdrachten veel zwaarder, dus daar verwachten we het omgekeerde.
  **Een meting op de iPad moet dat bevestigen.**
- De meetrit wacht nu eerst tot de wereld rond de route klaar is, zodat laden de meting niet beïnvloedt.
- Is de iPad te traag, dan verlaagt het spel vanzelf eerst de scherpte en daarna de zichtafstand (tot 3 chunks).

## Wat opvalt (4.3.0, licht en dag en nacht)

- 4.2.0 en 4.3.0 zijn vlak na elkaar gemeten met dezelfde instellingen (zichtafstand 6, zoals op een tablet).
  **Het licht kost op de testcomputer ±5% (4,2 → 4,0 fps)**; het doel was hoogstens 10%. De tekenopdrachten
  blijven gelijk: het licht zit in het kleurkanaal dat er al was, en de shader rekent één regel extra.
- Licht uitrekenen gebeurt in de worker: ±3,7 ms per chunk, naast ±7 ms voor de vlakken. Bij bouwen werkt
  de hoofdthread alleen het stukje licht bij dat verandert.
- **Let op voor later:** sinds 4.2.0 tekent de meetrit ±350.000 driehoeken in plaats van ±120.000 (en ±410
  tekenopdrachten in plaats van ±265). Waarschijnlijk komt dat door de grotten onder de grond (hun wanden
  worden ook getekend als je ze niet ziet) en misschien door een andere zichtafstand; dat zoeken we nog uit. Voor een iPad is dat nog
  weinig, maar het is een goede kandidaat om in 4E op te ruimen (grotten die je niet kunt zien overslaan).
- De meetrit meet altijd op het middaguur, zodat de metingen te vergelijken blijven.

## Wat opvalt (4.4.0, mooier beeld en geluid)

- **±4% trager dan 4.3.0** op de testcomputer (gemiddeld 3,8 → 3,65 fps, telkens twee metingen vlak na
  elkaar); het doel was hoogstens 5%. Tekenopdrachten en driehoeken blijven gelijk: de wolken zijn nu
  één vlak in plaats van 46 blokken, en de landschapskleur zit in een klein extra getal per hoekpunt.
- **Eerst was 4.4.0 een derde trager** (2,55 fps). Dat kwam helemaal door het *zachte* filteren van de
  texturen tussen twee pixels en twee mipmaps (`LinearMipmapLinear`); zonder videokaart is dat duur.
  Nu gebruikt het spel net als Minecraft per mipmap de dichtstbijzijnde pixel (`NearestMipmapNearest`):
  even snel als zonder mipmaps, scherpe pixels dichtbij, en in de verte toch geen geflikker meer.
  Op een echte iPad is zacht filteren waarschijnlijk wel goedkoop; dat kan later met een meting op de
  iPad opnieuw bekeken worden.

## Wat opvalt (4.5.0 en 4.6.0, blokken en bouwen)

- 4.5.0 en 4.6.0 zijn om en om gemeten (oud, nieuw, oud, nieuw). Beide gemiddeld ±3,95 fps: **even snel**
  als elkaar, en iets sneller dan de metingen van 4.4.0 (die op een ander moment zijn gedaan; verschillen
  van een paar procent zijn op de testcomputer ruis).
- De natuurkunde kost in de meetrit niets: er verandert niets, dus de wachtrij is leeg. De hand staat
  in de meetrit uit, zodat de metingen te vergelijken blijven met eerdere versies.
