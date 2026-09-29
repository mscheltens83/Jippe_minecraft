# Plan: JippeCraft 🧱

Een eigen Minecraft-achtig bouwspel voor Jippe (6 jaar), speelbaar op de iPad.

## 1. Wat moet het spel zijn?

| Doel | Wat betekent dat? |
|---|---|
| **Makkelijk bouwen** | Tik op een blok en er komt een nieuw blok tegenaan. Geen menu's, geen crafting. |
| **Geen lezen nodig** | Alle knoppen zijn plaatjes. Jippe hoeft niets te kunnen lezen. |
| **Veilig en rustig** | Geen monsters, geen schade, geen honger, geen doodgaan. Altijd dag. |
| **Werkt op iPad** | Grote knoppen, bediening met vingers, draait in Safari. Kan ook als app-icoon op het beginscherm. |
| **Niets kwijtraken** | De wereld wordt automatisch bewaard. Er is een knop om iets terug te zetten. |

## 2. Techniek

- **Webapp** (HTML + JavaScript) met **Three.js** voor de 3D-graphics.
  - Werkt in Safari op elke iPad, niets installeren via de App Store.
  - Kan via "Zet op beginscherm" als volledig scherm app met eigen icoon.
  - Werkt ook offline (service worker), handig in de auto.
- **Geen plaatjes van internet nodig**: alle blok-texturen worden door de code getekend
  (pixel-art van 16×16), dus geen auteursrechtproblemen met echte Minecraft-plaatjes.
- **Geen bouwstap**: gewone bestanden, direct te openen via een simpele webserver.
- Bewaren in de browser (`localStorage`), gecomprimeerd.

## 3. De wereld

- Een eiland van 96 × 96 blokken, 48 hoog, omringd door zee (zo is er een logische rand).
- Twee soorten nieuwe wereld:
  - 🏝️ **Heuvel-eiland**: glooiende heuvels, bomen, bloemen, een meertje en strand.
  - 🟩 **Plat grasveld**: helemaal vlak, ideaal om te bouwen.
- Onderin een onbreekbare bodem, zodat je nooit uit de wereld valt.
- Wolken die langzaam voorbij drijven.

## 4. Blokken (±30 stuks)

Gras, aarde, steen, keien, boomstam, planken, bladeren, glas, baksteen, zand, water,
sneeuw, goud, diamant, lamp, boekenkast, pompoen (met gezichtje), meloen, **regenboog**,
10 kleuren wol (rood, oranje, geel, groen, lichtblauw, blauw, paars, roze, wit, zwart)
en bloemen (rood en geel).

## 5. Bediening op de iPad

```
┌───────────────────────────────────────────────────────────┐
│ [🏠]                                  [➕ bouw | ⛏ sloop] [↶] │
│                                                           │
│          tik op een blok = bouwen of slopen               │
│          veeg met je vinger = rondkijken                  │
│                                                  [🪽 vliegen]│
│  ( joystick )                                     [▲]      │
│   = lopen          [■][■][■][■][■][■][■][■][■][📦]   [⤒ spring]│
└───────────────────────────────────────────────────────────┘
```

- **Links**: duim neerzetten = joystick verschijnt, schuiven = lopen.
- **Rechts / midden**: vegen = rondkijken.
- **Tikken op een blok**: bouwen of slopen, afhankelijk van de grote schakelaar bovenin
  (➕ groen = bouwen, ⛏ rood = slopen). Je tikt precies op de plek waar je het wilt.
- **Onderbalk**: 9 blokken om uit te kiezen, plus een kist 📦 met álle blokken.
- **Springen**: grote knop rechtsonder. Lopen tegen een opstapje = vanzelf springen.
- **Vliegen**: aan/uit-knop, met knoppen omhoog en omlaag.
- **Terug-knop (↶)**: zet de laatste acties terug (tot 200 stappen).
- **Menu (🏠)**: verder spelen, geluid aan/uit, nieuwe wereld (met "weet je het zeker?").
- Op een computer werkt het ook: WASD/pijltjes lopen, slepen met muis = kijken,
  klikken = bouwen/slopen, spatie = springen, F = vliegen, 1–9 = blok kiezen, E = kist.

## 6. Leuk maken (feedback)

- Plop-geluidje bij bouwen, krak-geluidje bij slopen (zelf gemaakte geluidjes, geen bestanden).
- Brokjes die wegspringen als je een blok sloopt.
- Mooie zachte schaduwen in hoekjes (ambient occlusion), zodat bouwwerken er goed uitzien.

## 7. Bestanden

```
index.html              startpagina
manifest.webmanifest    voor "zet op beginscherm"
sw.js                   offline werken
icons/                  app-iconen
lib/three.module.min.js 3D-bibliotheek (lokaal, voor offline)
js/
  main.js       opstarten en de spel-lus
  blocks.js     alle bloktypes
  textures.js   pixel-art texturen + blok-icoontjes
  world.js      wereld maken, bewaren en laden
  mesher.js     blokken omzetten naar 3D-vormen (per stuk van 16×16)
  scene.js      lucht, wolken, 3D-scene
  player.js     lopen, springen, vliegen, botsen
  raycast.js    welk blok tik je aan?
  input.js      touch, muis en toetsenbord
  ui.js         knoppen, onderbalk, kist, menu
  icons.js      knop-plaatjes (SVG)
  audio.js      geluidjes
  particles.js  brokjes
tests/smoke.mjs         automatische test in een (iPad-)browser
```

## 8. Stappen

1. ✅ Plan maken (dit document)
2. ✅ Wereld + texturen + 3D-weergave
3. ✅ Speler: lopen, springen, vliegen, botsen
4. ✅ Touch-bediening + bouwen/slopen
5. ✅ Onderbalk, kist, menu, terug-knop
6. ✅ Geluid, brokjes, wolken
7. ✅ Bewaren/laden, offline, app-icoon
8. ✅ Testen in een gesimuleerde iPad (Playwright) en publiceren

## 9. Hoe krijg je het op de iPad?

- **Snel testen**: via een claude.ai-link (Artifact) die op de iPad in Safari opent.
- **Blijvend als app**: de repository op GitHub Pages zetten (of Netlify/Cloudflare Pages),
  dan in Safari op *Deel → Zet op beginscherm*. Dan opent het schermvullend en werkt het offline.
  Zie `README.md` voor de stappen.

## 10. Fase 2 (klaar)

- ✅ Toren bouwen onder jezelf: blok onder je voeten = je wipt erop
- ✅ Slopen door vast te houden (met een rondje dat vol loopt en scheurtjes in het blok)
- ✅ Vlotter op oudere iPads (begint iets minder scherp en past zich aan)
- ✅ Dieren: varkentjes, kippen en schaapjes; aaien geeft geluid en hartjes
- ✅ Stempels: huisje, boom, toren en brug met één tik
- ✅ Nieuwe blokken: stuiterblok, deur, trap, gekleurd glas en vuurwerk
- ✅ Eigen poppetje met een camera die achter je hangt
- ✅ Rustig muziekje (aan/uit in het menu)
- ✅ Drie werelden, elk met een plaatje
- ✅ De claude.ai-versie bijgewerkt

## 11. Ideeën voor later

- Uitleg met een handje voor de eerste keer (zonder tekst)
- Dag/nacht-knop met sterren en lampen die licht geven
- Foto-knop om bouwwerken te bewaren of door te sturen
- Knoppen spiegelen voor linkshandigen
- Het shirt van het poppetje zelf een kleur geven

## 12. Fase 3 (gepland)

Jungle, woestijn, toendra, savanne en een avonturenwereld, wilde dieren (met leeuw, cheetah en
tijger voorop), roofdieren en stallen, temmen en rijden op de leeuw, en een dierenalbum.
Het uitgewerkte plan staat in [`docs/fase-3-plan.md`](docs/fase-3-plan.md).
