# JippeCraft fase 3: werelden, wilde dieren, stallen en rijden

Versie: 29 september 2026. Bedoeld om uit te laten voeren door een programmeer-assistent (OpenAI Codex of Claude), fase voor fase.

In fase 3 krijgt Jippe vier nieuwe werelden (jungle, woestijn, toendra, savanne) plus een avonturenwereld met alles erin. Elke wereld krijgt eigen blokken, bomen en dieren. Zijn favorieten **leeuw, cheetah en tijger** komen eerst en worden het mooist uitgewerkt. Roofdieren kunnen varkens, kippen en schapen opeten, dus wie zijn dieren wil houden, bouwt een stal met hekken. Een leeuw kun je temmen en erop rijden. Daarnaast komen er een dierenalbum, zes wereldplekken, weer en muziek per wereld.

---

## 1. Uitgangspunten (niet van afwijken)

| Punt | Afspraak |
|---|---|
| Doelgroep | Jippe, 6 jaar. Alles moet zonder lezen te begrijpen zijn: plaatjes, geluid, animatie. Tekst alleen als uitleg voor ouders (klein, onder de plaatjes). |
| Geen geweld | De speler gaat nooit dood en krijgt geen schade. "Opeten" is een tekenfilm-moment: een wolkje "poef", sterretjes, een smakgeluid. Geen bloed en geen lichaam dat achterblijft. |
| iPad eerst | Bediening met vingers. Doel: minstens 40 beelden per seconde op een iPad 7e generatie met 30 dieren in beeld. De bestaande automatische aanpassing van de beeldscherpte blijft. |
| Techniek | Gewone ES-modules, Three.js r170 (staat in `lib/`), **geen bouwstap**. Het spel draait via GitHub Pages vanaf de branch `claude/compassionate-dirac-pkrfgp`, dus alle paden blijven relatief. |
| Oude werelden | Bestaande opslag moet blijven werken (zie §10). Jippe mag niets kwijtraken. |
| Stijl | Code-commentaar in het Nederlands, in dezelfde stijl als de huidige code. Kleine, overzichtelijke modules. |
| Taal in het spel | Nederlands. |

---

## 2. Hoe de code nu werkt (kaart voor de bouwer)

| Bestand | Wat het doet | Wat er in fase 3 verandert |
|---|---|---|
| `js/blocks.js` | Bloktypes met `def(id, naam, tex, opts)`, tabel `OPAQUE`, familie-blokken (trap 41–44, deur 45–60), speciale items (`ITEM`/`SPECIALS`, id 200+: stempels 200–203, dieren 210–212), `PALETTE_GROUPS` voor de kist | Nieuwe blokken 61 t/m ±110, nieuwe stempels en dieren als items, extra tab in de kist |
| `js/textures.js` | Pixel-art 16×16 met code getekend (`GEN`), atlas van 256×256 (plek voor 256 tegels, nu ±60 in gebruik), blok-iconen, scheurtjes en hartje | ±45 nieuwe texturen |
| `js/world.js` | Wereld van 96×96×48 (`SX`, `SY`, `SZ`), `SEA = 10`, `generate(type)` met `generateIsland` en `generateFlat`, bomen, opslaan als RLE + base64 | Biomen-generator per wereldtype, nieuwe bomen en bouwwerken |
| `js/mesher.js` | Chunks (16×16) naar 3D-vlakken met zachte schaduw; rendersoorten `solid`, `cutout`, `glass`, `water`, `cross`, `shape` (losse blokjes via `BLOCKS[id].boxes`) | Hekken die aan elkaar vastgroeien, hangende lianen, dunne vormen (bamboe, cactus) |
| `js/player.js` | Lopen, springen, vliegen, zwemmen, stuiteren; botsen met blokjes (`gather`, `moveAxis`), vanzelf opstappen (0,6) | Glad ijs, modder, klimmen in lianen, rijden op een dier, blokjes hoger dan 1 (hek 1,5) |
| `js/animals.js` | 3 dieren (varken, kip, schaap): klasse `Animal` (lopen, grazen, huppelen, aaien), beheerder `Animals` (maximaal 40, `spawn`, `populate`, `pick`, `serialize`, `load`) | Een systeem op basis van gegevens, 23 nieuwe dieren, jagen, vluchten, slapen, temmen, rijden |
| `js/models.js` | Blokkige figuren: `box()`, `merge()`, `part()` met schaduw per kant | Geometrie hergebruiken per diersoort (cache) |
| `js/avatar.js` | Poppetje met loop- en vlieghouding | Zithouding tijdens het rijden |
| `js/stamps.js` | Stempels huisje, boom, toren, brug (`buildStamp`) | Iglo, piramide, tempel, leeuwenrots |
| `js/scene.js` | Lucht, zon, zee, wolken, chunk-meshes, scheurtjes, klaarzetten van shaders | Kleuren en mist per wereld, weer (sneeuw) |
| `js/particles.js` | Brokjes, vuurwerk, hartjes, glitters | Sneeuwvlokken, "poef"-wolkje, Zzz, waterfontein (olifant), confetti (schatkist) |
| `js/audio.js`, `js/music.js` | Zelfgemaakte geluiden en muziek | Dierengeluiden, achtergrondgeluid en muziekstijl per wereld |
| `js/ui.js`, `js/icons.js`, `css/style.css` | HUD, kist met tabbladen, menu met panelen (`main`, `worlds`, `type`, `confirm`) | 7 wereldsoorten, 6 plekken, dierenalbum, knop "afstappen", instelling "roofdieren jagen" |
| `js/storage.js`, `js/main.js` | Plekken 1–3 in `localStorage` (+ artifact-database op claude.ai), opslagformaat v2 | 6 plekken, formaat v3 (§10) |
| `tests/smoke.mjs` | Playwright-test in een nagebootste iPad (`?vast` = vaste beeldkwaliteit), nu 53 controles | Controles per fase erbij (§12) |

Nieuwe bestanden: `js/biomes.js` (wereldrecepten), `js/structures.js` (grote bouwwerken bij het maken van een wereld), `js/album.js` (dierenalbum), `js/weather.js` (sneeuw en achtergrondgeluid). Bij veel dieren kun je `js/animals.js` opsplitsen in `js/animals/` (bijvoorbeeld `core.js`, `farm.js`, `savanna.js`, `jungle.js`, `desert.js`, `tundra.js`).

---

## 3. Werelden

### 3.1 Wereldsoorten en menu
- **Nieuwe wereld** toont 7 grote kaarten met een plaatje: Eiland, Plat, Jungle, Woestijn, Toendra, Savanne, Avontuur.
- **6 wereldplekken** in een raster van 3×2. Nu zijn het er 3 (`SLOTS` in `main.js`, sleutels in `storage.js`).
- `world.type` krijgt de waarden `island`, `flat`, `jungle`, `desert`, `tundra`, `savanna` en `adventure`.
- Nieuw bestand `js/biomes.js` met per soort een recept. Voorbeeld:

```js
export const BIOMES = {
  savanna: {
    naam: 'Savanne',
    lucht: { boven: '#58a6e0', horizon: '#f6d9a0', mist: '#efd29a', mistBegin: 50, mistEind: 130 },
    zee: true,
    grond: { top: B.DRY_GRASS, onder: B.RED_DIRT, onderWater: B.SAND },
    hoogte: { basis: 12, heuvels: 2, schaal: 30, plateaus: { drempel: 0.55, extra: 5 } },
    bomen: [{ soort: 'acacia', dichtheid: 0.006 }],
    planten: [{ blok: B.TALL_DRY_GRASS, dichtheid: 0.12 }, { blok: B.TERMITE, dichtheid: 0.002, hoog: [2, 4] }],
    bouwwerken: ['leeuwenrots', 'drinkplaats'],
    dieren: [['lion', 3], ['cheetah', 2], ['elephant', 2], ['giraffe', 2], ['zebra', 4], ['hippo', 1], ['meerkat', 3]],
    weer: null, achtergrond: 'krekels', muziek: 'savanne',
  },
  // jungle, desert, tundra, island, flat, adventure ...
};
```

- `World.generate(type)` leest het recept. `generateIsland` blijft het voorbeeld; de biomen gebruiken dezelfde ruis (`makeNoise`) en eilandvorm, zodat elke wereld een logische rand met zee houdt.
- De wereld blijft **96×96×48**, ook de avonturenwereld. Dat houdt de iPad snel en voorkomt een grote verbouwing (`SX`/`SZ` worden op veel plekken gebruikt). Een grotere avonturenwereld (128×128) staat als open vraag in §14.

### 3.2 Recept per wereld

| Wereld | Landschap | Bomen en planten | Bouwwerken | Lucht (boven / horizon / mist) | Weer en geluid |
|---|---|---|---|---|---|
| **Jungle** | Heuvelachtig: basis 13, heuvels 6, ruisschaal 22. Een kronkelende rivier: waar `|ruis(x/40, z/40)| < 0,06` gaat de grond naar zeeniveau en komt er water. | Reuzenboom: stam 2×2 van junglehout, 12–16 hoog, kruin met straal 4, lianen van 3–6 lang aan de randen (dichtheid 0,006). Kleine junglebomen, 6–8 hoog (0,02). Bosjes van bladeren, 1–2 hoog (0,03). Varens (0,08), oerwoudbloemen (0,02), groepjes bamboe van 3–6 hoog (0,004), meloenen (0,002). | Tempel: trapvormige piramide van mossige keien (9×9, 5 hoog) met ingang en een schatkist, 20–30 blokken van het begin. Watervalletje van een heuvel (mag later). | `#3f9fdc` / `#bfe8d0` / `#a9d8c0`, mist 30–90 (dichter) | Soms een vallend blaadje, vogelgefluit |
| **Woestijn** | Duinen: basis 12, heuvels 3, langgerekte ruis (`x/30`, `z/12`). 3 lagen zand, daaronder zandsteen. Rood-zandgebied waar ruis2 > 0,5: plateaus van 18–22 hoog met lagen terracotta. | Cactussen 1–3 hoog (0,01), dode struikjes (0,01). Oases: 2–3 vijvers (straal 3–5) in lage plekken, met een ring gras en 3–5 palmbomen. | Piramide van zandsteen (grondvlak 15×15, 8 hoog) met gang, kamer en schatkist, ±25 blokken van het begin. | `#5fb0e8` / `#f3e2b0` / `#f0dca8`, mist 50–130 | Zacht windgeluid |
| **Toendra** | Basis 12, heuvels 4. Sneeuw bovenop, 2 lagen aarde, dan steen. Meren bevroren: de bovenste waterlaag wordt ijs. | Sparren: stam 6–9, kegelvormige naalden met sneeuw op de bovenkant (0,012). Besneeuwde stenen (0,004). IJspilaren van pakijs, 4–8 hoog (0,001). | 1–2 iglo's vlak bij het begin | `#7fb2dc` / `#e6f2fb` / `#dfeaf5`, mist 40–110 | Vallende sneeuwvlokken, zachte wind |
| **Savanne** | Vlak: basis 12, heuvels 2. Enkele rotsplateaus (ruis > 0,55 geeft +5, met stenen randen). Droog gras bovenop, rode aarde eronder. | Acacia's: stam 4–6 (iets scheef), platte kruin met straal 3, twee lagen (0,006). Hoog droog gras (0,12). Termietenheuvels van 2–4 hoog (0,002). | **Leeuwenrots** (stenen rots met een overhangend plat stuk, ±9×6, 7 hoog, met een helling om op te lopen) 12–18 blokken van het begin; daar ligt een leeuw op. **Drinkplaats**: vijver met straal 5–7 en een rand modder, 15–20 blokken van het begin. | `#58a6e0` / `#f6d9a0` / `#efd29a` (goudkleurig), mist 50–130 | Krekels, vogels |
| **Eiland / Plat** | Blijven zoals ze zijn | Blijven zoals ze zijn | – | Zoals nu | Zoals nu |
| **Avontuur** | Vier gebieden in één wereld: noordwest jungle, noordoost toendra, zuidoost savanne, zuidwest woestijn. In het midden een weitje met boerderijdieren, waar je begint. Grenzen lopen over ±8 blokken in elkaar over (hoogte vermengd, bovenblok gekozen per gebied met wat ruis). | Per gebied het recept van die wereld, met ongeveer de halve dichtheid | Leeuwenrots, piramide, iglo en tempel elk één keer, in het eigen gebied | Mengen per plek: de kleuren schuiven mee als je van gebied wisselt | Per gebied |

Op elke plek waar je begint, blijft een plat stuk van straal 8 om te bouwen (net als nu).

### 3.3 Lucht, mist en licht
- Nieuwe functie `GameScene.setBiome(biome)`: kleurverloop van de lucht, mistkleur, mistbegin en -eind, aantal wolken, kleur van de zon.
- In de avonturenwereld elke halve seconde `setBiome` met gemengde kleuren op basis van de plek van de speler, zacht overlopend in ±2 seconden.

### 3.4 Weer en achtergrondgeluid (`js/weather.js`)
- **Sneeuw** (toendra): ±150 vlokjes als instanced mesh in een doos rond de camera die meeschuift; ze vallen langzaam en wiebelen een beetje. Het aantal mag lager als de beeldscherpte omlaag gaat.
- **Blaadjes** (jungle): af en toe een groen vlokje dat langzaam naar beneden dwarrelt.
- **Achtergrondgeluid** met Web Audio: vogels (korte sinus-tjilpjes op willekeurige momenten), wind (gefilterde ruis die langzaam aan- en afzwelt), krekels (hoge korte tikjes). Zachtjes, en uit als het geluid uit staat.

### 3.5 Muziek per wereld
`Music` krijgt een stijl als instelling (toonladder, instrument, ritme):
- **jungle**: pentatonisch mineur, marimba-achtig (driehoeksgolf die snel wegsterft);
- **woestijn**: toonladder met een "oosterse" kleur (frygisch dominant), getokkeld (zaagtand met laagdoorlaatfilter);
- **toendra**: klokjes (hoge sinus, langzaam);
- **savanne**: pentatonisch met een zacht trommelritme (ruis en een lage sinus als "boem");
- **eiland/plat**: zoals nu.

---

## 4. Nieuwe blokken

De voorgestelde id's sluiten aan op de huidige (0–60 zijn in gebruik). Waar "kist-tab" staat, komt een blok in de kist: **Blokken** (bouwen), **Natuur** (nieuw tabblad voor biome-blokken en planten), **Stempels**, **Dieren**.

| Id | Naam | Rendersoort | Textuur (16×16) | Bijzonder | Wereld | Kist-tab |
|---|---|---|---|---|---|---|
| 61 | Junglehout | solid | Stam donkerbruin-groen met mosvlekjes, bovenkant met jaarringen | – | Jungle | Natuur |
| 62 | Junglebladeren | cutout | Donkergroen met geelgroene spikkels, gaatjes | – | Jungle | Natuur |
| 63 | Liaan | cross (hangend) | Groene slingers | Niet vast; wie erin staat, kan klimmen (springknop = omhoog, omlaag-knop = omlaag, vooruit tegen een liaan = omhoog) | Jungle | Natuur |
| 64 | Bamboe | shape (5/16 breed) | Lichtgroen met knopen | Stapelbaar; panda's eten ervan | Jungle | Natuur |
| 65 | Varen | cross | Groene varen | – | Jungle | Natuur |
| 66 | Oerwoudbloem | cross | Roze/oranje tropische bloem | – | Jungle | Natuur |
| 67 | Mossige keien | solid | Keien met groene plekken | – | Jungle | Blokken |
| 68 | Zandsteen | solid | Lichtgele lagen | – | Woestijn | Blokken |
| 69 | Bewerkt zandsteen | solid | Zandsteen met een patroon | – | Woestijn | Blokken |
| 70 | Cactus | shape (14/16 breed) | Groen met stekeltjes, bovenkant met bloemetje | Doet geen pijn (geen schade in dit spel) | Woestijn | Natuur |
| 71 | Dode struik | cross | Bruine takjes | – | Woestijn | Natuur |
| 72 | Palmhout | solid | Lichtbruine stam met ringen | – | Woestijn | Natuur |
| 73 | Palmbladeren | cutout | Heldergroen | – | Woestijn | Natuur |
| 74 | Rood zand | solid | Oranjerood zand | – | Woestijn | Blokken |
| 75 | Terracotta oranje | solid | Effen oranje met spikkels | – | Woestijn | Blokken |
| 76 | Terracotta bruin | solid | Effen bruin | – | Woestijn | Blokken |
| 77 | Schatkist | shape (14/16) | Hout met gouden beslag | Tik = deksel open, confetti, munt-glitters, fanfare; wordt 78 | Tempel, piramide | Blokken |
| 78 | Schatkist (open) | shape | Open kist met goud | – | – | – |
| 79 | IJs | glass (doorzichtig lichtblauw) | Lichtblauw met witte strepen | **Glad**: je glijdt door als je de joystick loslaat (wrijving ±10% van normaal) | Toendra | Natuur |
| 80 | Pakijs | solid | Lichtblauw met witte barstjes | Ook glad | Toendra | Natuur |
| 81 | Sparrenhout | solid | Donkerbruine stam | – | Toendra | Natuur |
| 82 | Sparrennaalden | cutout | Donker blauwgroen | – | Toendra | Natuur |
| 83 | Besneeuwde naalden | cutout | Naalden, bovenkant wit | – | Toendra | Natuur |
| 84 | Droog gras | solid | Bovenkant geelgroen; zijkant rode aarde met een geel randje | – | Savanne | Natuur |
| 85 | Rode aarde | solid | Roodbruin met spikkels | – | Savanne | Blokken |
| 86 | Acaciahout | solid | Grijze bast, oranje binnenkant bovenop | – | Savanne | Natuur |
| 87 | Acaciabladeren | cutout | Olijfgroen | – | Savanne | Natuur |
| 88 | Hoog droog gras | cross | Gele grassprieten | – | Savanne | Natuur |
| 89 | Termietenheuvel | solid | Rode aarde met gaatjes | – | Savanne | Natuur |
| 90 | Modder | solid | Donkerbruin, glimmend | Lopen gaat half zo snel | Savanne | Natuur |
| 91 | **Hek** | shape (verbindend) | Planken | Paaltje (4/16 breed) plus latjes naar hekken of vaste blokken ernaast. **Botshoogte 1,5**: dieren en de speler kunnen er niet overheen springen. | Alle | Blokken |
| 92–99 | **Hekdeur** | shape | Planken | Als een deur (4 richtingen × open/dicht). Tik = open/dicht. Dicht ook botshoogte 1,5. Dieren openen hem nooit. | Alle | Blokken |
| 100 | **Hooibaal** | solid | Geel stro met touwtjes, bovenkant spiraal | Boerderijdieren blijven graag in de buurt (§6.5) | Alle | Blokken |

Technische aandachtspunten:
- **Hek (91)**: de vorm hangt af van de buren. Voeg aan het blok een functie toe, bijvoorbeeld `boxesAt(world, x, y, z)`, die `mesher.js` en `player.js` allebei gebruiken. Het paaltje en de latjes lopen tot y = 1,5, dus tot in het vakje erboven.
- **Blokjes hoger dan 1**: `gather()` in `player.js` moet ook het vakje onder de voeten meenemen (`lo[1] - 0.5`), anders botst de speler niet met het bovenste halve stuk van een hek. Dieren behandelen een hek als "2 hoog": ze huppelen er niet overheen (§6.4).
- **Glad ijs**: in `Player.update` hangt de versnelling (`accel`) af van het blok onder je voeten: ijs 1,5 in plaats van 14, dus je glijdt door.
- **Modder**: halve loopsnelheid als je erop staat.
- **Lianen**: staat de speler in een liaan-vakje, dan geldt geen zwaartekracht maar klimmen (net als vliegen, maar langzamer: 2,5 blok per seconde).
- **Hangende lianen** mogen als een `cross` gerenderd worden, of als een plat vlak tegen de zijkant van een bladerblok als dat mooier is.
- De atlas heeft genoeg ruimte (±60 + ±45 van de 256 tegels).

Nieuwe **stempels** (tab Stempels): Iglo (sneeuwkoepel 7×7 met ingang), Piramide (kleine versie 9×9), Tempel (kleine versie) en Leeuwenrots. Een stempel "Stal" komt er **niet** in (zie open vraag 2): Jippe moet zijn stal zelf bouwen met hek, hekdeur en hooibaal.

---

## 5. Dieren

### 5.1 Eén systeem voor alle dieren
Maak van `animals.js` een systeem op basis van gegevens. Elk dier is dan één regel in een tabel, plus een functie die het figuurtje bouwt:

```js
export const SPECIES = {
  lion: {
    naam: 'Leeuw', werelden: ['savanna', 'adventure'], w: 0.9, h: 1.2, snelheid: 1.4, rensnelheid: 5,
    bouw: buildLion, geluid: 'roar', dieet: 'roofdier', rijdbaar: true,
    kunstjes: ['slapen', 'brullen'], slaapkans: 0.6,
  },
  // ...
};
```

- **Geometrie hergebruiken**: bouw per soort de onderdelen één keer (cache). Elk dier krijgt eigen `Mesh`-objecten die dezelfde geometrie delen. Met ±26 soorten en tot 60 dieren is dat nodig voor het geheugen van de iPad.
- **Minder rekenen op afstand**: dieren verder dan 40 blokken weg krijgen maar één op de vier keer een update, en worden niet geanimeerd als ze niet in beeld zijn.
- **Maximum**: van 40 naar 60 dieren. Is de iPad te traag, dan terug naar 40 (constante `MAX_ANIMALS`).
- **Toestanden** (vast lijstje): `rust`, `lopen`, `grazen`, `slapen`, `sluipen`, `jagen`, `vluchten`, `eten`, `blij`, `volgen`, `bereden`. Elke toestand heeft een eigen houding: poten, kop en staart.
- Vaardigheden als losse stukjes code die een soort kan aanzetten: `vliegen`, `klimmen`, `zwemmen`, `glijden`, `rennen`, `spuiten`, `verstoppen`, `opduiken`, `slapen`.

### 5.2 Alle dieren

★ = favoriet van Jippe: eerst bouwen, met het meeste detail.

| Dier | Wereld | Uiterlijk (kleuren) | Wat het doet | Tik erop | Roofdier |
|---|---|---|---|---|---|
| ★ **Leeuw** | Savanne | Lijf zandkleurig `#d9a45a`; **grote manen** `#8a4b1f` rond de kop (blok groter dan de kop); staart met donker plukje; neus `#5a3a2a` | Ligt vaak te luieren in de schaduw of op de leeuwenrots (poten gevouwen, kop op de poten, "Zzz") | Brult (laag gegrom), schudt zijn manen, hartjes | Ja |
| ★ Leeuwin | Savanne | Zelfde kleur, zonder manen, slanker | Zoals de leeuw, loopt meer rond | Gromt zacht, hartjes | Ja |
| ★ **Cheetah** | Savanne | Slank met lange poten, geel `#e8c068` met **zwarte vlekjes** (kleine donkere blokjes op lijf en poten), zwarte "traanstrepen" op het gezicht | Rent af en toe een stukje heel hard (9 blokken per seconde, 2 seconden, met stofwolkjes) | Spint, hartjes | Ja |
| ★ **Tijger** | Jungle | Oranje `#e8872a` met **zwarte strepen** (dunne donkere blokjes dwars over het lijf), witte buik en wangen | Zwemt graag, sluipt door de jungle | Vriendelijke brul, hartjes | Ja |
| Aap | Jungle | Bruin `#7a4a2a`, gezicht `#e8c7a0`, lange staart | Klimt in boomstammen, zit in de bladeren | Springt op en neer, "oe-oe-aa-aa" | Nee |
| Papegaai | Jungle | Rood `#e23b3b`, vleugels blauw en geel | Vliegt tussen de boomtoppen, landt op bladeren | Krijst, fladdert | Nee |
| Panda | Jungle (bij bamboe) | Wit met zwarte oren, ogen, poten en schouders | Zit bamboe te eten | Rolt om | Nee |
| Kikker | Jungle (bij water) | Groen met gele buik | Springt rond, zwemt | "Kwak" en een grote sprong | Nee |
| Luiaard | Jungle | Grijsbruin | Hangt supertraag onder bladeren | Draait heel langzaam zijn kop en lacht | Nee |
| Kameel | Woestijn | Zandkleur `#d6b27a`, één bult | Sjokt langzaam | Kauwt, knippert | Nee (later rijdbaar) |
| Stokstaartje | Woestijn, savanne | Lichtbruin, donkere oogvlekken | Gaat steeds rechtop staan om rond te kijken | Duikt weg in de grond en komt weer op | Nee |
| Woestijnvos | Woestijn | Crème, **enorme oren** | Trippelt rond | Oren wiebelen, "jip" | Nee |
| Hagedis | Woestijn | Groen-geel, klein | Schiet snel heen en weer | Rent snel weg | Nee |
| Schildpad | Woestijn (bij de oase) | Groen schild, bruine poten | Heel langzaam | Kruipt 3 seconden in zijn schild | Nee |
| IJsbeer | Toendra | Wit `#f4f4f0`, groot | Zwemt, loopt rustig rond | Rolt op zijn rug | Nee (later rijdbaar) |
| Pinguïn | Toendra | Zwart-wit, oranje snavel en voeten | Waggelt (lijf wiebelt), glijdt op zijn buik over ijs en naar beneden, loopt in groepjes | Fladdert en glijdt weg | Nee |
| Rendier | Toendra | Bruin met gewei | Loopt in een kudde | Schudt zijn kop | Nee |
| Poolvos | Toendra | Wit | Trippelt rond | Duikt in de sneeuw en komt eruit | Nee |
| Zeehond | Toendra (bij water) | Grijs | Ligt aan de waterkant, zwemt | Klapt met zijn vinnen, "ork ork" | Nee |
| Sneeuwuil | Toendra | Wit met donkere stipjes | Vliegt, zit in sparren | Draait zijn kop helemaal rond | Nee |
| Olifant | Savanne | Grijs, groot (2 breed, 2,2 hoog), slurf in stukjes die zwaait, grote oren | Loopt rustig, wappert met zijn oren | **Spuit water** (fontein van waterdruppels) en trompettert | Nee (later rijdbaar) |
| Giraf | Savanne | Geel met bruine vlekken, heel hoog (3,5) | Eet van de acaciabladeren (nek omhoog) | Oren wiebelen, nek knikt | Nee |
| Zebra | Savanne | Wit met zwarte strepen | Loopt in een kudde | Hinnikt, schopt vrolijk | Nee |
| Nijlpaard | Savanne (drinkplaats) | Grijspaars | Ligt bijna altijd in het water | Gaapt heel groot | Nee |
| Varken, kip, schaap | Eiland, plat, midden van Avontuur | Zoals nu | Zoals nu | Zoals nu | Nee, dit zijn de **prooidieren** |

Alle 23 nieuwe dieren komen ook in de kist (tab Dieren, per wereld gegroepeerd met een klein wereldicoontje), zodat Jippe ze overal kan neerzetten.

### 5.3 Hoe de vaardigheden werken
- **Vliegen** (papegaai, uil): kies een doelpunt in de lucht (4–10 blokken boven de grond, straal 12), vlieg ernaartoe met een licht op-en-neer, land op bladeren of een hoog blok. Geen zwaartekracht tijdens het vliegen.
- **Klimmen** (aap): staat er een stam naast, dan gaat het dier langs de stam omhoog of omlaag. Bovenin zit hij in de bladeren.
- **Zwemmen** (tijger, ijsbeer, zeehond, kikker, nijlpaard): water houdt ze niet tegen; ze drijven aan het oppervlak.
- **Glijden** (pinguïn): op ijs of naar beneden over sneeuw kantelt het lijf plat en gaat hij twee keer zo snel.
- **Rennen** (cheetah): af en toe een sprint van 2 seconden, met stofwolkjes.
- **Spuiten** (olifant): de slurf gaat omhoog en er komt een fontein van ±40 waterdruppels.
- **Verstoppen / opduiken** (schildpad, stokstaartje, poolvos): een korte animatie waarin het dier (half) verdwijnt en terugkomt.
- **Slapen** (leeuw vaak, anderen soms): een slaaphouding met "Zzz" (kleine letter-z-plaatjes die opstijgen).

---

## 6. Roofdieren en stallen

Dit is wat de ouder wil: Jippe moet een stal of hok bouwen als hij zijn varkens en kippen wil houden. Het blijft wel lief en eerlijk. Jippe ziet het aankomen en kan zelf ingrijpen.

### 6.1 Wie eet wie
- **Roofdieren**: leeuw, leeuwin, cheetah, tijger.
- **Prooidieren**: varken, kip, schaap.
- Wilde dieren (zebra, giraf, enzovoort) worden **niet** opgegeten. De speler nooit. Een getemde leeuw jaagt niet.

### 6.2 Hoe een jacht verloopt
1. **Honger**: elk roofdier krijgt een willekeurige honger-timer van 3–6 minuten speeltijd (in het menu staat de tijd stil). Na het eten begint die opnieuw.
2. **Zoeken**: een hongerig roofdier zoekt het dichtstbijzijnde prooidier binnen 16 blokken.
3. **Waarschuwen**: boven de prooi verschijnt een "!"-wolkje. Het roofdier **sluipt** 3 seconden langzaam naar voren: laag bij de grond, staart zwiepend.
4. **Achtervolgen**: daarna rent het roofdier (leeuw en tijger 5 blokken per seconde, cheetah 8, in stootjes). De prooi **vlucht** met 3,5 blokken per seconde van het roofdier weg.
5. **Vangen**: is het roofdier binnen 1 blok, dan volgt een grote witte **"poef"**-wolk met sterretjes (bij een kip ook veertjes). De prooi is weg en je hoort een smakgeluid ("nom nom"). Het roofdier gaat zitten, likt zijn snoet en **slaapt 2 minuten** ("buik vol", Zzz).
6. **Opgeven**: kan het roofdier de prooi 20 seconden niet bereiken (hek, muur, water), dan gaat het zitten, kijkt nog even en loopt weg. Daarna 60 seconden geen honger. Zo blijft het niet eindeloos bij het hek staan.

### 6.3 Jippe kan ingrijpen
- **Tik op een jagend roofdier**: het schrikt, er komen hartjes, het gaat liggen en jaagt 30 seconden niet.
- **Prooidieren terugzetten** kan altijd vanuit de kist. Opeten is dus nooit echt voorgoed; het is een reden om te bouwen.

### 6.4 Wat een stal veilig maakt
- Roofdieren (en alle dieren) kunnen niet over een **hek** (1,5 hoog), een **dichte hekdeur** of een **muur van 2 blokken hoog**. Een muur van 1 blok hoog is **niet** veilig: daar huppelen dieren gewoon overheen. Zo leert Jippe om het goed te doen.
- Dieren openen geen deuren of hekdeuren. Een dak is niet nodig: roofdieren klimmen en vliegen niet.
- Het achtervolgen gaat recht op de prooi af. Botst het roofdier langer dan 3 seconden, dan probeert het een stapje opzij. Echte routeplanning is niet nodig; het opgeven na 20 seconden (§6.2) regelt de rest.
- In de dier-code betekent een hek-vakje: "dit vakje en het vakje erboven zijn dicht". Dus niet overheen huppelen.

### 6.5 Hooibaal
Boerderijdieren binnen 6 blokken van een hooibaal lopen er niet verder dan 6 blokken vandaan. Een stal met een hooibaal houdt ze dus bij elkaar.

### 6.6 Instelling voor ouders
In het menu komt een schakelaar **"Roofdieren jagen"** (icoon: leeuw + varken), standaard **aan**. Staat hij uit, dan jagen roofdieren nooit. De instelling geldt voor alle werelden en wordt bewaard.

### 6.7 Waar prooidieren voorkomen
Varkens, kippen en schapen staan vanzelf op het eiland, in de platte wereld en in het midden van de avonturenwereld. In savanne en jungle alleen als Jippe ze daar zelf neerzet (of als ze in de avonturenwereld naar een ander gebied lopen). Vooral in de avonturenwereld ontstaat zo spanning: de leeuwen van de savanne kunnen naar het weitje in het midden lopen.

---

## 7. Temmen en rijden

### 7.1 Temmen
- **3 keer op dezelfde leeuw tikken binnen 10 seconden.** De hartjes worden elke tik groter. Na de derde tik: glitters, een fanfare en een **rood zadel met een gouden randje** op zijn rug. De leeuw is nu een **vriendjes-leeuw**.
- Een vriendjes-leeuw jaagt nooit en **volgt Jippe** op 3–6 blokken afstand als die binnen 20 blokken is. Anders zwerft hij rond.
- Dat de leeuw getemd is, wordt bewaard in de wereld.
- Werkt ook voor de leeuwin. Voor cheetah en tijger later (open vraag 7).

### 7.2 Rijden
- **Tik op een vriendjes-leeuw** om erop te klimmen. Het poppetje gaat in een zithouding op de leeuw. De camera gaat tijdens het rijden vanzelf achter je hangen (daarna weer terug zoals het was).
- **Besturen**:
  - de joystick laat de leeuw lopen; helemaal doorduwen is rennen (6,5 blokken per seconde, met rennende poten);
  - de springknop laat de leeuw **2 blokken hoog** springen (hij kan dus over een hek, maar hij eet niemand zolang je erop zit);
  - de vliegknop wordt de knop **"afstappen"** (icoon: pijltje naar beneden naast een leeuw).
- **Bouwen en slopen** blijft tijdens het rijden gewoon werken.
- **Botsen**: tijdens het rijden gebruikt `Player` de maten van de leeuw plus de berijder (breedte 0,9, hoogte 1,9) en de snelheden van de leeuw. De leeuw volgt de positie van de speler; zijn eigen gedrag staat stil (toestand `bereden`).
- **Afstappen**: je komt naast de leeuw te staan en de leeuw gaat zitten. Bij opslaan of laden stap je automatisch af.
- Maak het algemeen (`rijdbaar: true` plus snelheden per soort), zodat later ook cheetah (sneller), tijger (zwemt mee), kameel, olifant (hoog zitten) en ijsbeer kunnen.

---

## 8. Dierenalbum (`js/album.js`)
- Nieuwe knop **Album** (boek-icoon) in het menu, eventueel ook in het spel.
- Een raster met **alle 26 dieren**, per wereld gegroepeerd (een kopje met de kleur en het icoon van de wereld). Gevonden dieren staan in kleur met hun naam. Nog niet gevonden dieren zijn een grijs silhouet met "?".
- **Ontdekken**: aait Jippe een diersoort voor het eerst, dan vliegt een grote sticker naar het boek-icoon, met een fanfare en "Nieuw!".
- **Tik op een sticker** in het album: je hoort het geluid van het dier en er is een kleine animatie.
- De stickers worden bij het opstarten gemaakt van het echte 3D-figuurtje: in een aparte, verborgen renderer, 128 px, bewaard als plaatje. Zo zien ze eruit zoals in het spel.
- Het album geldt voor alle werelden en wordt bewaard in de instellingen (`settings.album = ['lion', ...]`). Ouders kunnen het album leegmaken via het menu (met bevestiging).

---

## 9. Menu en schermen
- **Hoofdmenu**: Spelen, Geluid, Muziek, Werelden, **Album**, **Roofdieren jagen** (aan/uit).
- **Werelden**: 6 plekken (3×2). Bij een lege plek of bij "opnieuw beginnen" kies je uit 7 wereldsoorten (grote kaarten met een plaatje, 2 rijen). Opnieuw beginnen vraagt altijd om bevestiging, met het plaatje van de wereld die weggaat (zoals nu).
- **Kist**: 4 tabbladen, **Blokken**, **Natuur** (nieuw), **Stempels**, **Dieren**. Binnen Natuur en Dieren een kopje per wereld.
- **HUD tijdens het rijden**: de vliegknop wordt "afstappen".
- **Nieuw-dier-popup** (§8) en **"!"-wolkjes** boven bedreigde prooi (§6.2).
- Alles met grote knoppen van minstens 60 px en plaatjes, net als nu.

---

## 10. Bewaren (opslagformaat v3)

```js
{
  v: 3, t, type /* island|flat|jungle|desert|tundra|savanna|adventure */, seed,
  blocks, player, hotbar, sel, mode, thumb,
  animals: [{ t: 'lion', x, y, z, yaw, tame: true, hunger: 142.5, sleep: 0 }],
  riding: false, // bij laden altijd afgestapt
}
```

- **Van v1/v2 naar v3**: ontbrekende velden krijgen standaardwaarden (`tame: false`, een nieuwe honger-timer). Oude wereldsoorten blijven hetzelfde.
- **6 plekken**: sleutels `jippecraft.slot1.v1` t/m `slot6.v1` (de bestaande 1–3 blijven zoals ze zijn). In `main.js` wordt `SLOTS` `[1, 2, 3, 4, 5, 6]`.
- **Instellingen**: `settings = { muted, music, third, predators: true, album: [] }`.
- **Grootte**: een wereld is na compressie ±20–80 kB, dus 6 plekken passen ruim in `localStorage` (±5 MB). Op claude.ai geldt 250 kB per wereld; dat blijft haalbaar.

---

## 11. Snelheid op de iPad
- Geometrie per diersoort delen (§5.1) en dieren op afstand minder vaak bijwerken.
- Sneeuwvlokjes maximaal 150 en minder bij een lage beeldscherpte; brokjes maximaal 700 (zoals nu).
- Chunks opnieuw bouwen: maximaal 2–3 per beeldje (zoals nu). Grote bouwwerken worden bij het maken van de wereld gebouwd, niet tijdens het spelen.
- Mist per wereld begrenst hoe ver je kijkt (jungle het dichtst).
- Na elke fase de beelden per seconde meten in de test (ter informatie) en op een echte iPad proberen.

---

## 12. Testen (uitbreiding van `tests/smoke.mjs`)
Gebruik vaste `seed`-waarden, zodat werelden bij elke test hetzelfde zijn. Testhulp mag via `window.__jippecraft` (bestaat al). Alle bestaande 53 controles moeten blijven slagen.

| # | Test | Verwacht |
|---|---|---|
| 1 | Elke wereldsoort maken | Jungle: veel junglehout en lianen; woestijn: vooral zand en minstens 1 cactus; toendra: sneeuw en ijs; savanne: droog gras en acaciahout; avontuur: alle vier aanwezig |
| 2 | Dieren per wereld | Savanne: minstens 1 leeuw en 1 cheetah; jungle: minstens 1 tijger; toendra: pinguïns |
| 3 | Leeuw jaagt | Platte wereld, varken en hongerige leeuw op 6 blokken: binnen de tijdslimiet is het varken weg en slaapt de leeuw |
| 4 | Hek beschermt | Varken in een omheining van 5×5 (hek + dichte hekdeur), hongerige leeuw erbuiten: na 30 seconden leeft het varken nog en is de leeuw opgegeven |
| 5 | Lage muur beschermt niet | Muur van 1 blok hoog: de leeuw komt er wel bij |
| 6 | Ingrijpen | Tik op een jagende leeuw: hij stopt met jagen |
| 7 | Instelling uit | "Roofdieren jagen" uit: hongerige leeuw jaagt niet |
| 8 | Temmen | 3 keer tikken: `tame` is true en er zit een zadel op |
| 9 | Rijden | Tik op de getemde leeuw: je rijdt; de joystick beweegt leeuw en speler samen; de springknop springt 2 hoog; "afstappen" werkt |
| 10 | Album | Een nieuw dier aaien: album +1 en de popup is zichtbaar |
| 11 | Menu | 6 plekken, 7 wereldsoorten, tab Natuur in de kist |
| 12 | Blokken | IJs: je glijdt na het loslaten nog door; liaan: je klimt omhoog; modder: je bent langzamer |
| 13 | Opslag | Wereld v2 laadt goed als v3; na herladen is de leeuw nog getemd |
| 14 | Snelheid | Gemiddelde beeldtijd wordt gemeld (ter informatie, geen harde eis in de test-browser) |

Tip voor wie de test draait: Playwright met Chromium is nodig (`npm install`, daarna `npx playwright install chromium` als de browser ontbreekt). De test-browser tekent in software en is traag; wacht daarom met `waitForFunction` en ruime tijden, niet met vaste pauzes.

---

## 13. Volgorde van bouwen

Elke fase is los te spelen en te testen. Per fase: een eigen branch en een pull request naar `claude/compassionate-dirac-pkrfgp`. Na het samenvoegen staat het binnen een paar minuten live op GitHub Pages.

| Fase | Wat | Klaar als |
|---|---|---|
| **A ✅** | Werelden en blokken: `biomes.js`, 4 wereldrecepten + avontuur, alle nieuwe blokken en texturen (behalve hek en hekdeur), bomen, planten, bouwwerken (tempel, piramide, iglo, leeuwenrots, drinkplaats, oase), lucht en mist per wereld, 7 wereldsoorten in het menu, 6 plekken, tab Natuur, opslag v3, glad ijs, modder, lianen | Tests 1, 11, 12 (zonder hek), 13 slagen; elke wereld ziet er herkenbaar uit |
| **B ✅** | Het nieuwe dierensysteem (§5.1) + ★ **leeuw, leeuwin, cheetah, tijger** met veel detail + savannedieren (olifant, giraf, zebra, nijlpaard, stokstaartje) | Test 2 (savanne, tijger) slaagt; de favorieten zien er mooi uit en hebben hun kunstjes |
| **C** | Roofdieren en stallen: honger, sluipen, jagen, vluchten, poef, slapen, opgeven, ingrijpen, hek, hekdeur, hooibaal, instelling voor ouders | Tests 3 t/m 7 slagen |
| **D** | Temmen en rijden op de leeuw (algemeen opgezet) | Tests 8 en 9 slagen |
| **E** | De overige dieren van jungle, woestijn en toendra, met hun vaardigheden | Test 2 volledig; elk dier heeft zijn kunstje |
| **F** | Dierenalbum, nieuw-dier-popup, stickers van de 3D-figuurtjes | Test 10 slaagt |
| **G** | Extra's: weer en achtergrondgeluid, muziek per wereld, schatkisten met confetti, sneeuwpop die gaat lopen (2 sneeuwblokken + pompoen erop), eventueel jonge dieren in een stal (twee dezelfde boerderijdieren bij een hooibaal in een afgesloten stal krijgen na 2 minuten een jong) | Handmatig proberen op de iPad |

Waarom deze volgorde: eerst de werelden (daar hangt alles aan), dan meteen Jippe's favorieten (B), dan wat de ouder het belangrijkst vindt (C en D), en daarna de rest.

---

## 14. Open vragen (met de keuze die we aanhouden zolang niemand iets anders zegt)
1. **Jaagt een getemde leeuw?** Nee.
2. **Een stempel "Stal"?** Nee, Jippe bouwt zijn stal zelf met hek, hekdeur en hooibaal.
3. **Roofdieren jagen**: standaard aan, uit te zetten in het menu.
4. **Grootte van de avonturenwereld**: 96×96. Groter (128×128) kan later, maar vraagt een verbouwing (`SX`/`SZ` per wereld).
5. **Leeuwin**: ja, als variant zonder manen.
6. **Eten leeuwen ook wilde dieren (zebra)?** Nee.
7. **Rijden op cheetah en tijger**: later, na de leeuw (het systeem is er dan al klaar voor).
8. **Kan een bereden leeuw over een hek springen?** Ja, maar hij eet niemand zolang je erop zit.

---

## 15. Afspraken per fase ("klaar" betekent)
- `npm test` slaagt: alle oude en nieuwe controles, geen fouten in de console.
- Werkt vanaf GitHub Pages: alleen relatieve paden, geen bouwstap.
- `sw.js`: nieuwe bestanden in `FILES` en `CACHE` één versie hoger (voor offline spelen).
- `README.md` bijgewerkt (tabel "Hoe speel je?") en `PLAN.md` met de status van fase 3.
- Oude opslag getest: een wereld uit fase 2 laadt zonder verlies.
- Nederlands commentaar in dezelfde stijl. Geen nieuwe externe bibliotheken zonder overleg.
