# JippeCraft fase 4: van blokkenspel naar echte Minecraft-kloon

Versie: 10 oktober 2026. Bedoeld om fase voor fase uit te laten voeren door een programmeer-assistent (Claude of OpenAI Codex).

Het doel was altijd: **een Minecraft-kloon voor een kind van 6, met extra werelden**. Na fase 1–3 is JippeCraft een leuk bouwspel met veel dieren. Het voelt alleen nog niet als Minecraft: de wereld is een klein eiland van 96 × 96 blokken, er zijn geen bergen, grotten, ertsen of dorpen, het is altijd dag en een lamp geeft geen licht. In fase 4 krijgt het spel een nieuwe wereldmotor: een **eindeloze wereld met biomen, grotten, licht en dag en nacht**, veel meer blokken, Minecraft-dieren en dorpen. De themawerelden (jungle, woestijn, toendra, savanne) worden **extra werelden die je via een portaal bereikt**, zoals de Nether in Minecraft.

Wat JippeCraft nu al bijzonder maakt, blijft: geen schade en geen monsters, alles zonder lezen te begrijpen, stempels, de terug-knop, de leeuw, rijden, stallen, het dierenalbum.

---

## 1. Uitgangspunten (niet van afwijken)

| Punt | Afspraak |
|---|---|
| Doelgroep | Jippe, 6 jaar. Plaatjes, geluid en animatie in plaats van tekst. Tekst alleen klein, voor ouders. |
| Speelwijze | Zoals Minecraft *Creatief* op *Vredig*: je gaat nooit dood, je hebt geen honger, er zijn geen monsters en je hoeft niets te verzamelen of te maken. Alles staat in de kist. |
| Niet eng | De nacht is kort en nooit pikdonker. Grotten zijn schemerig, niet zwart. Ouders kunnen dag en nacht uitzetten. |
| iPad eerst | Bediening met vingers. Doel: 60 beelden per seconde, minimaal 40 op een iPad uit 2019 of nieuwer, bij een zichtafstand van 5 chunks (zie §5.3). |
| Techniek | Gewone ES-modules, Three.js r170 uit `lib/`, **geen bouwstap**. Web Workers als module-worker (Safari 15+). GitHub Pages draait vanaf branch `claude/compassionate-dirac-pkrfgp`, dus alle paden blijven relatief. |
| Niets kwijt | Alle 6 bewaarde werelden blijven speelbaar (§10). Bij elke omzetting blijft het origineel als reserve bewaard. |
| Eigen werk | Geen texturen, geluiden of modellen van Minecraft kopiëren (auteursrecht). Wel dezelfde stijl: 16 × 16 pixel-art, blokkig. |
| Stijl | Code-commentaar in het Nederlands, in de stijl van de huidige code. Kleine modules. Spel in het Nederlands. |
| Elke fase af | Elke fase is los speelbaar en wordt apart samengevoegd. Alle bestaande tests blijven slagen. |

---

## 2. Waar staan we? (Minecraft naast JippeCraft)

| Onderdeel | Minecraft | JippeCraft nu | Gat |
|---|---|---|---|
| Wereldgrootte | Eindeloos, 384 hoog | 96 × 96, 48 hoog, met zee eromheen | **Groot** |
| Terrein | Bergen, rivieren, stranden, grotten, ertsen, ravijnen | Zachte heuvels (hoogstens ±28), geen grotten of ertsen | **Groot** |
| Biomen | Tientallen, vloeiend in één wereld | Eén biome per wereld; Avontuur heeft er 4 in vakken | **Groot** |
| Licht | Zon, fakkels, dag en nacht, donker onder bomen en in grotten | Vaste schaduw per kant en in hoekjes; lamp straalt niets uit; altijd middag | **Groot** |
| Texturen | Herkenbare pixel-art; gras en bladeren kleuren per biome; mipmaps | Vooral ruis; in de verte flikkert alles (geen mipmaps) | Middel |
| Blokken | Honderden; trappen, platen en hekken van elk materiaal; fakkels, bedden, ladders | 101 soorten; trap, hek en deur alleen van eikenhout | Middel |
| Water en zand | Water stroomt, zand en grind vallen, emmer | Alles blijft staan | Middel |
| Speler | Hand met blok, sprinten, sluipen, kijkhoek | Geen hand; vliegen kan wel | Klein |
| Dieren | Koe, paard, hond, kat, konijn, vos, bij, dorpelingen, vissen | 27 soorten (veel wilde), geen koe, paard of hond, niets in zee | Middel |
| Bouwwerken | Dorpen, tempels, schipwrakken, mijnschachten | 4 stempels + piramide, tempel, iglo en leeuwenrots | Middel |
| Extra werelden | Nether en End via een portaal | Kiezen in het menu | Middel |
| Geluid | Voetstappen per ondergrond, omgeving per biome | Geluid bij bouwen en slopen; omgeving per wereld; geen voetstappen | Klein |
| Techniek | — | Alles op de hoofdthread; opslag in `localStorage` (±5 MB); geen automatische tests bij een pull request; 2 wankele testcontroles | Middel |

Het grootste gat zit in de **wereld zelf**: grootte, terrein en licht. Daarom komt de nieuwe wereldmotor (4B) vóór alle andere zichtbare verbeteringen.

---

## 3. Volgorde en omvang

| Fase | Wat | Omvang | Hangt af van | Status |
|---|---|---|---|---|
| **4A** | Fundament: meten, automatische tests op GitHub, kleine fouten | Klein (1 PR) | – | ✅ Klaar (10 oktober 2026); nulmeting op de iPad nog doen |
| **4B** | Nieuwe wereldmotor: eindeloze chunks, workers, opslag in IndexedDB, oude werelden omzetten | Zeer groot (2–3 PR's) | 4A | ✅ Klaar (versie 4.1.0); iPad-meting nog doen |
| **4C** | Minecraft-terrein: biomen, bergen, rivieren, grotten, ertsen, bomen | Groot | 4B | ✅ Klaar (versie 4.2.0) |
| **4D** | Licht, dag en nacht, fakkels, bed | Groot | 4B | ✅ Klaar (versie 4.3.0) |
| **4E** | Mooier beeld: nieuwe texturen, mipmaps, biome-kleuren, water, wolken, voetstappen | Middel | 4D | ✅ Klaar (versie 4.4.0) |
| **4F** | Blokken en bouwen: ±150 nieuwe blokken, standen, vallend zand, stromend water, kist en hand | Groot (2 PR's) | 4B (licht-blokken: 4D) | ✅ Klaar (F1 versie 4.5.0, F2 versie 4.6.0) |
| **Snel** | Sneller maken na de eerste iPad-meting (38 fps): onzichtbare grotten niet tekenen, meetrit met extra rondjes | Klein | 4F | ✅ Klaar (versie 4.7.0) |
| **4G** | Dieren en dorpen: Minecraft-dieren, fokken, dorpen met dorpelingen, leven in zee | Groot | 4C | Gepland |
| **4H** | Extra werelden en portalen | Middel | 4C, 4G | Gepland |

Na elke fase: samenvoegen, op de iPad proberen (checklist in §13) en dan pas verder.

---

## 4. Fase 4A: fundament (meten, testen, kleine fouten)

Eerst zorgen dat we kunnen **meten** en dat fouten **automatisch** opvallen. Zonder dat is een nieuwe wereldmotor een gok.

1. **Meetscherm `?fps`.** Rechtsboven een klein kader met beelden per seconde, de langzaamste 5% beeldjes (p95), tekenopdrachten, driehoeken en chunks in de wachtrij. Werkt op de iPad: zet `?fps` achter het adres.
2. **Meetrit `?meet`.** De camera vliegt 30 seconden een vaste route over een savanne met 60 dieren. Daarna verschijnt een kaart met p50, p95 en het laagste aantal beelden per seconde, plus het iPad-model als dat bekend is. Een ouder maakt er een schermafbeelding van. Leg de uitkomst vast in `docs/metingen.md` als **nulmeting**.
3. **Versie zichtbaar.** Klein versienummer onderin het menu (bijvoorbeeld `v4.0.1`), gelijk aan `CACHE` in `sw.js`. Dan zie je meteen of de iPad de nieuwste versie heeft.
4. **Foutenlogboek.** De laatste 20 fouten (`error`, `unhandledrejection`) gaan naar `localStorage`. Op een ouderscherm (achter een knop die je 3 seconden ingedrukt houdt) staan de versie, de fouten en een knop "kopieer".
5. **Tests op GitHub.** Een workflow `.github/workflows/test.yml` draait bij elke pull request `npm ci`, `npm run lint` en `npm test` met Chromium. Een PR met rode tests wordt niet samengevoegd.
6. **Lint.** ESLint als dev-afhankelijkheid met een eenvoudige flat config, script `npm run lint`. Ruim de meldingen op (onder andere de ongebruikte `BLOCKS`-import in `js/animals/core.js`).
7. **Wankele tests.** In `tests/phase-c.mjs` wacht een controle direct na een tik niet tot het spel de tik verwerkt heeft. Maak een hulpfunctie `tapAndWait(page, x, y, conditie)` die `waitForFunction` gebruikt, en gebruik die overal na een tik.
8. **Snelle tests.** Nieuwe map `tests/unit/` met tests in gewone Node (zonder browser) voor pure modules: ruis, generator, licht, opslag. `npm test` draait eerst deze, daarna de browsertests.
9. **Kleine verbeteringen.**
   - De rijcamera komt hoger en verder naar achteren, zodat je de leeuw ziet.
   - `blockBoxes()` maakt bij lucht steeds een nieuwe lege lijst; geef één vaste lege lijst terug.

**Klaar als:** de workflow is groen op GitHub, de nulmeting van de iPad staat in `docs/metingen.md` en de 2 wankele controles slagen 10 keer achter elkaar.

---

## 5. Fase 4B: nieuwe wereldmotor (eindeloze wereld)

Dit is het hart van fase 4. De rest van de code (speler, dieren, stempels, raycast) blijft werken, omdat de wereld **dezelfde functies** houdt: `get(x, y, z)`, `set(x, y, z, id)`, `inside(x, y, z)` en `surfaceY(x, z)`.

Doe het in 2 of 3 PR's: **B1** chunks, generator-worker en tekenen; **B2** opslag, omzetten van oude werelden en "naar huis"; eventueel **B3** voor het fijnslijpen van de snelheid op de iPad.

### 5.1 Maten

| Wat | Nu | Nieuw |
|---|---|---|
| Wereld | 96 × 96 × 48, vast | Eindeloos in x en z, met een zachte wereldrand op ±4.096 blokken |
| Hoogte | 48 | **128** (constante `HEIGHT`; terugvallen op 96 als de iPad het niet trekt) |
| Zeeniveau | 10 | **48** |
| Chunk | 16 × 16 kolom | 16 × 16 × 128, verdeeld in 8 **secties** van 16 × 16 × 16 |
| Blok-id | `Uint8Array` (max 255) | **`Uint16Array`** (ruimte voor fase 4F) |
| Licht | – | `Uint8Array` per blok: zon (4 bits) en blokverlichting (4 bits), gevuld in 4D |
| Items (stempels, dieren) | id 200+ | id **60000+** (botsen anders met nieuwe blokken); de opgeslagen onderbalk omzetten |

Geheugen: één chunk is 64 kB aan blokken plus 32 kB aan licht. Bij zichtafstand 6 (13 × 13 = 169 chunks plus een rand) is dat ±20 MB, ruim binnen wat een iPad aankan.

### 5.2 Nieuwe bestanden

| Bestand | Wat |
|---|---|
| `js/engine/chunk.js` | Klasse `Chunk`: `blocks`, `light`, `heightmap`, vlaggen `generated`, `lit`, `edited` (door Jippe veranderd), `dirtySections` |
| `js/engine/world.js` | Eindeloze `World`: chunks in een `Map` (sleutel `cx,cz`), `get`/`set`, chunks laden rond de speler, wegzetten wat ver weg is, markeren van secties die opnieuw getekend moeten worden (ook bij de buren) |
| `js/engine/worker.js` | Module-worker: chunk maken, licht berekenen (4D) en vlakken bouwen. Stuurt `ArrayBuffer`s terug als *transferable* (zonder kopiëren) |
| `js/engine/pool.js` | Verdeelt werk over 1–2 workers (`navigator.hardwareConcurrency - 1`, maximaal 2) |
| `js/engine/noise.js` | Simplex-ruis 2D en 3D, met octaven (fBm), deterministisch per seed |
| `js/engine/gen/*.js` | Generator per wereldsoort (in 4B: de huidige recepten omgezet, zie 5.4) |
| `js/engine/mesher.js` | De huidige `mesher.js`, maar per sectie en met buren uit omliggende chunks |
| `js/engine/save.js` | Opslag in IndexedDB (§5.6) |
| `js/engine/migrate.js` | Oude werelden omzetten (§10) |

`js/world.js` wordt een dun laagje dat `js/engine/world.js` doorgeeft, zodat imports elders niet hoeven te veranderen.

### 5.3 Laden en tekenen

- **Zichtafstand** (in chunks) staat standaard op 5 op een tablet en op 8 op een computer. De automatische kwaliteitsregeling verlaagt bij haperen eerst de beeldscherpte en daarna de zichtafstand (minimaal 3). Mist begint op 70% en eindigt op 95% van de zichtafstand.
- **Volgorde van laden:** dichtbij eerst, en wat voor je ligt gaat voor wat achter je ligt.
- **Wat de workers doen:** een nieuwe chunk wordt helemaal in een worker gemaakt en getekend. De hoofdthread krijgt alleen kant-en-klare buffers en maakt er per frame maximaal 4 `BufferGeometry`'s van (`updateChunks`-budget, net als nu).
- **Bouwen voelt direct:** als Jippe een blok zet of sloopt, bouwt de hoofdthread die ene sectie meteen opnieuw (±1 ms) en de buursectie alleen als het blok op de rand ligt. Geen wachten op een worker.
- **Tekenopdrachten beperken:** de vlakken van alle secties in één kolom worden per materiaal samengevoegd tot één mesh. Dat zijn per chunk hoogstens 3 tekenopdrachten (`solid`, `cutout`, `transparant`). Doel: hoogstens 300 tekenopdrachten in beeld.
- **Wegzetten:** chunks verder dan zichtafstand + 2 worden opgeruimd (geometrie `dispose`). Chunks met `edited` worden eerst bewaard.
- **Zee aan de horizon:** de vlakken voor de zee rondom (`buildSea`) blijven, maar schuiven met de speler mee en liggen op het nieuwe zeeniveau. Zo loopt de zee door tot de horizon.

### 5.4 Generator in 4B (de huidige werelden, nu eindeloos)

In 4B blijft het terrein ongeveer zoals het nu is, maar dan oneindig en per chunk te maken. Het mooie terrein komt in 4C.

- Elke chunk wordt alleen uit `(seed, cx, cz)` gemaakt: dezelfde seed geeft altijd precies dezelfde chunk. Dat is ook de reden dat we alleen veranderde chunks hoeven te bewaren.
- **Bomen en bouwwerken over chunkgrenzen heen:** een chunk bekijkt ook de "plekken voor bomen en bouwwerken" van zijn 8 buren en zet alleen de blokken die binnen zijn eigen chunk vallen. Bouwwerken krijgen een vaste plek per **regio** van 8 × 8 chunks (te berekenen uit de seed).
- **Bouwplek bij de start:** rond `(0, 0)` blijft een vlakke weide van ±16 blokken, net als nu.
- **Wereldsoorten in 4B:** Plat (eindeloos), Eiland (één groot eiland van ±400 blokken in een eindeloze zee) en de 4 themawerelden (eindeloos, met de huidige recepten uit `biomes.js`). Avontuur wordt in 4C vervangen door de Grote wereld (§6.1).

### 5.5 Dieren in een eindeloze wereld

- Bij het maken van een chunk worden er dieren geplaatst volgens het recept van het biome (zoals `populate` nu doet, maar per chunk).
- **Simulatieafstand:** dieren bewegen en jagen alleen binnen 4 chunks van de speler. Verder weg staan ze stil en worden ze niet getekend.
- **Dieren blijven bestaan:** als een chunk wordt weggezet, gaan zijn dieren mee in de opslag van die chunk. Als hij weer laadt, komen ze terug. Tamme dieren volgen je altijd mee, ook naar een andere chunk.
- `MAX_ANIMALS` (60) geldt voor de dieren binnen de simulatieafstand.

### 5.6 Opslag (formaat v4)

| Wat | Waar |
|---|---|
| Instellingen | `localStorage` (zoals nu, klein) |
| Per wereldplek: soort, seed, speler, thuis, onderbalk, tamme dieren, tijd van de dag, plaatje | IndexedDB, database `jippecraft`, store `werelden`, sleutel `slot1`…`slot6` |
| Chunks die Jippe heeft veranderd | IndexedDB, store `chunks`, sleutel `slot1:wereld:cx:cz`, RLE over `Uint16` (zoals nu, maar per chunk) |

- Onveranderde chunks worden **niet** bewaard; die maakt de generator opnieuw. Een wereld waarin veel gebouwd is, blijft zo meestal onder 1 MB.
- **Automatisch bewaren:** elke 10 seconden als er iets veranderd is, en bij `visibilitychange` en `pagehide` (de iPad sluit tabbladen zonder te waarschuwen).
- Vraag `navigator.storage.persist()` aan, zodat Safari de opslag niet zomaar opruimt.
- **Reservekopie:** in het ouderscherm een knop "Reservekopie maken" (download of deelvenster, één `.json` met alle plekken) en een knop "Terugzetten".
- De opslag in de claude.ai-artifactdatabase vervalt: het spel draait nu op GitHub Pages.

### 5.7 Niet verdwalen

Een eindeloze wereld is voor een kind van 6 makkelijk om in te verdwalen. Daarom:

- Een **huisknop** (kompasje) in beeld. Tik erop: een wolkje glitters en je staat weer thuis. Thuis is het startpunt, of je bed vanaf 4D.
- Een klein **kompaspijltje** boven de onderbalk wijst naar huis zodra je meer dan 50 blokken van huis bent.

### 5.8 Klaar als
- Je kunt minstens 1.000 blokken in één richting vliegen zonder haperingen en zonder gaten in de wereld.
- De meetrit (`?meet`) haalt op de computer minstens de nulmeting en op de iPad minstens 40 beelden per seconde bij zichtafstand 5.
- Dezelfde seed geeft dezelfde chunks (unit-test met een hash van de blokken).
- Alle oude werelden openen correct (§10), en alle testcontroles van fase 1–3 slagen nog.
- Bouwen, slopen, terug, deuren, hekken, stallen, jagen en rijden werken ook op een chunkgrens.

---

## 6. Fase 4C: Minecraft-terrein

### 6.1 De Grote wereld
Een nieuwe wereldsoort **Grote wereld**: één eindeloze wereld met alle biomen, zoals Minecraft. Hij vervangt *Avontuur* als keuze (oude avontuurwerelden blijven speelbaar, zie §10). In het menu komt hij als eerste en grootste kaart.

### 6.2 Biomen kiezen zoals Minecraft
Elk punt krijgt 4 waarden uit trage ruis: **temperatuur**, **vochtigheid**, **land/zee** en **ruigheid**. Die bepalen samen het biome:

| Biome | Herkenbaar aan | Dieren (vanaf 4G) |
|---|---|---|
| Vlakte | Gras, bloemen, losse eiken | Koe, varken, schaap, kip, paard |
| Bos en berkenbos | Veel eiken en berken | Wolf, konijn |
| Bloemenveld | Heel veel bloemen | Bij, konijn |
| Sparrenbos (taiga) | Sparren, varens, besjes | Vos, wolf |
| Besneeuwde vlakte en toendra | Sneeuw, ijs, sparren | IJsbeer, poolvos, pinguïn |
| Bergen | Steen, sneeuw op de toppen, tot ±110 hoog | Geit, lama |
| Woestijn | Zand, cactussen, zandsteen | Kameel, fennek, stokstaartje |
| Mesa (badlands) | Lagen terracotta | Hagedis |
| Savanne en savanneplateau | Droog gras, acacia's, leeuwenrots | Leeuw, cheetah, olifant, giraffe, zebra |
| Jungle en bamboebos | Reuzenbomen, lianen, bamboe | Tijger, aap, papegaai, panda |
| Moeras | Ondiep water, lianen, waterlelies | Kikker |
| Strand | Zand langs de zee | Schildpad |
| Zee en warme zee | Diep water, zeewier, koraal (warm) | Vissen, dolfijn (4G) |
| Rivier | Slingert tussen de biomen door | – |

- **Overgangen** zijn vloeiend: de hoogte wordt gemengd over de biomen (zoals `biomeWeights` nu), en gras- en bladkleur mengen over 5 × 5 kolommen (4E).
- **Biomen zijn groot genoeg** om in te spelen: gemiddeld 200–400 blokken breed.
- **Start:** de speler begint altijd in een Vlakte, vlak bij bos en water.

### 6.3 Vorm van het land
- **Hoogte:** een basishoogte uit land/zee (zee, kust, binnenland), plus heuvels en bergen uit ruigheid. Bergen met kliffen via 3D-ruis in een smalle hoogteband (overhangen en bogen, maar niet te veel).
- **Rivieren:** waar een rivierruis dicht bij 0 komt, snijdt een rivier van 4–8 blokken breed tot net onder zeeniveau.
- **Stranden** waar land de zee raakt (zand, of grind bij steile kusten).

### 6.4 Onder de grond
- **Grotten:** 3D-ruis voor tunnels ("spaghetti") en grotere zalen ("kaas"), tussen y = 4 en een paar blokken onder het maaiveld. Soms met een opening naar boven, zodat Jippe ze vindt.
- **Ondergrondse meren** van water onderin grote zalen. Geen lava (zie §14).
- **Ertsen**, in kleine klompjes: kolen (overal), ijzer, koper, goud (dieper), lapis, redstone en diamant (diep). Smaragd alleen in bergen.
- **Afwisseling in steen:** graniet, dioriet, andesiet, grind, klei bij rivieren.
- **Onderin** een laag onbreekbare bodem, net als nu.
- **Snel genoeg:** reken de 3D-ruis op een grof raster (elke 4 × 8 × 4 blokken) en vul de rest in met lineaire interpolatie. Doel: hoogstens 15 ms per chunk in de worker op de iPad.

### 6.5 Bomen
Eik (klein en groot), berk, spar (ook besneeuwd), jungle (klein en reus 2 × 2), acacia, palm (bestaat al) en moerasboom met lianen. Elke boomsoort krijgt eigen hout en bladeren (berk is nieuw). Paddenstoelen in donker bos, bessenstruiken in de taiga.

### 6.6 Bestaande bouwwerken
Piramide (woestijn), tempel (jungle), iglo (sneeuw), leeuwenrots en waterpoel (savanne) worden met de regio-methode (§5.4) in hun biome geplaatst. Ze krijgen een binnenkant met een schatkist. Dorpen komen in 4G.

### 6.7 Klaar als
- In een Grote wereld vind je binnen 500 blokken van de start minstens 6 verschillende biomen (test op 5 vaste seeds).
- Elke biome uit de tabel komt binnen 2.000 blokken voor (test op 5 vaste seeds).
- Er zijn grotten met ertsen, en de leeuwenrots staat in de savanne.
- De worker maakt een chunk in hoogstens 15 ms op de iPad (meten met `?fps`).

---

## 7. Fase 4D: licht, dag en nacht

### 7.1 Licht per blok
- **Zonlicht** (0–15): valt recht naar beneden tot het eerste dichte blok. Bladeren en water houden er een beetje van tegen. Daarna verspreidt het zich opzij, met 1 minder per blok.
- **Blokverlichting** (0–15) van: fakkel 14, lantaarn 15, lamp 15 (de bestaande lamp gaat nu echt licht geven), gloeisteen 15, pompoenlantaarn 15, kampvuur 15, regenboogblok 10.
- Bij een nieuwe chunk wordt het licht in de worker berekend. Bij bouwen en slopen werkt de hoofdthread het licht bij met de bekende twee-wachtrijen-methode (eerst weghalen, dan opnieuw verspreiden), ook over chunkgrenzen.
- **Zachte overgangen:** de mesher geeft elke hoek het gemiddelde licht van de 4 blokken eromheen (*smooth lighting*), naast de bestaande schaduw in hoekjes.

### 7.2 Shader
Alle wereldmaterialen krijgen een eigen stukje shader (via `onBeforeCompile` op de bestaande materialen, of een `ShaderMaterial`). Per hoekpunt komen 2 waarden mee: zonlicht en blokverlichting. Per beeldje komt er één waarde `daglicht` (0,2–1) bij.

```
helderheid = max(zonlicht × daglicht, blokverlichting × warme kleur) × hoekschaduw
```

- **Nooit pikdonker:** de helderheid is altijd minstens 0,18 (ouderinstelling "Grotten lichter" maakt dat 0,35).
- **Dieren en het poppetje** krijgen het licht van de plek waar ze staan, zodat ze 's nachts en in grotten mee donkerder worden.

### 7.3 Dag en nacht
- Een hele dag duurt 20 minuten: 13 minuten dag, 1 minuut avond, 5 minuten nacht en 1 minuut ochtend.
- Een vierkante zon en maan bewegen langs de lucht. 's Nachts zijn er sterren. Bij zonsopkomst en zonsondergang kleurt de horizon oranje. De kleuren mengen met de lucht van het biome (`biomeView`).
- 's Nachts gaan de dieren slapen (de bestaande Zzz) en hoor je krekels en uilen.
- **Bed:** tik 's nachts op een bed. Het scherm wordt zacht donker en weer licht, en het is ochtend. Het bed wordt je nieuwe **thuis** (huisknop, §5.7).
- **Ouderinstelling** "Dag en nacht": aan (standaard) of "altijd dag".
- De tijd van de dag wordt per wereld bewaard.

### 7.4 Nieuwe blokken in deze fase
Fakkel (op de grond en tegen een muur, met vlammetje en rook), lantaarn (staand en hangend), gloeisteen, pompoenlantaarn, kampvuur (met rook en knisper-geluid) en bed in 16 kleuren (2 blokken lang).

### 7.5 Klaar als
- In een grot zonder fakkels is het schemerig. Een fakkel maakt een cirkel van licht met een straal van ±13 blokken.
- Een fakkel zetten of weghalen past het licht binnen 1 beeldje aan, ook op een chunkgrens.
- Een volle dag-en-nachtcyclus loopt (test met versnelde tijd), en een bed slaat de nacht over.
- Met "altijd dag" blijft het middag.
- Op de iPad kost het licht hoogstens 10% beelden per seconde ten opzichte van 4C.

### 7.6 Zo is het gebouwd (versie 4.3.0)
- `js/engine/light.js`: licht per chunk (`Chunk.light`, zon × 16 + lamp). Een nieuwe chunk krijgt zijn licht in de worker, uitgerekend over 3 × 3 chunks (licht komt niet verder dan 15 blokken, dus dat klopt precies). Bouwen en slopen werkt het licht bij met de twee-wachtrijen-methode, ook over chunkgrenzen; een unit-test vergelijkt na honderden willekeurige veranderingen met alles opnieuw uitrekenen.
- De mesher stopt schaduw, zonlicht en lamplicht in het kleurkanaal (rood, groen, blauw); de shader rekent met het daglicht van dat moment. Geen extra geheugen per hoekpunt.
- Kleine afwijkingen van het plan: bladeren en water houden geen zonlicht tegen (anders wordt elk bos donker); 's nachts is het buiten 0,3 licht in plaats van 0,2; de lichtkromme is zachter dan in Minecraft, zodat een fakkel voor een kind duidelijk licht geeft; bedden zijn er in de 10 wolkleuren in plaats van 16.
- Extra: `?tijd=nacht` (of `ochtend`, `middag`, `avond`, een getal van 0 tot 1) achter het adres zet de tijd, handig voor foto's en tests. De meetrit meet altijd op het middaguur.
- Licht uitrekenen kost op de testcomputer ±3,7 ms per chunk (in de worker), naast ±7 ms voor de vlakken.

---

## 8. Fase 4E: mooier beeld en geluid

### 8.1 Nieuwe texturen
- Alle texturen worden opnieuw getekend in een duidelijke **Minecraft-stijl**: 16 × 16 pixels, een beperkt palet per blok en herkenbare vormen in plaats van ruis. Bijvoorbeeld: planken met nerf en spijkers, keien als losse stenen met donkere randen, bladeren als plukjes met gaatjes, een grasrand die over de zijkant van een grasblok hangt, en ertsen als gekleurde klontjes in steen.
- Ze blijven met code getekend in `js/textures.js`, zonder plaatjesbestanden. Dat houdt het klein en zonder bouwstap. Maak per familie een helperfunctie, bijvoorbeeld `ore(t, kleur)`, `logSide(t, schors)`, `planks(t, hout)` en `leaves(t)`.
- Laat een ouder de vergelijking zien op een **testpagina** `?texturen` met alle tegels op een raster. Zo is het makkelijk om te beoordelen en bij te stellen.

### 8.2 Scherp dichtbij en rustig in de verte
- Overstappen van één atlas-plaatje naar een **`THREE.DataArrayTexture`** (één laag per tegel, WebGL2). Dan zijn er **mipmaps** zonder dat tegels in elkaar overlopen. Dat haalt het flikkeren en de ruis in de verte weg.
- Mipmaps voor bladeren en glas zo maken dat de doorzichtigheid behouden blijft (anders verdwijnen bomen in de verte). Gebruik *anisotropische filtering* als de iPad dat ondersteunt.
- De mesher geeft per vlak een `laag`-nummer mee in plaats van atlas-coördinaten.

### 8.3 Kleur per biome
Gras, bladeren, varens en water worden in grijs getekend en per hoekpunt gekleurd met de kleur van het biome (gemengd over 5 × 5 kolommen). Zo is gras in de jungle felgroen, in de savanne geelgroen en in de taiga blauwgroen, net als in Minecraft.

### 8.4 Water en lucht
- **Water:** golvende textuur (bewegende lagen in de shader), helderder aan de oppervlakte en donkerder op diepte. Waterlelies blijven drijven.
- **Onder water:** blauwe mist en een blauwe tint, en de wereld klinkt gedempt.
- **Wolken** in Minecraft-stijl: één platte laag blokwolken uit een 2D-patroon op een vaste hoogte, die langzaam verschuift. Dat vervangt de losse wolkenblokken.

### 8.5 Brokjes en geluid
- **Brokjes:** bij slopen vliegen er stukjes van de **echte textuur** van het blok in het rond in plaats van gekleurde puntjes.
- **Voetstappen** per ondergrond: gras, steen, hout, zand, sneeuw, wol en water. Zelfgemaakt met de bestaande `Sounds`, zonder bestanden.
- **Omgevingsgeluid per biome en per moment:** vogels overdag, krekels 's nachts, druppels in grotten en zachte golven bij de zee.
- **Muziek:** de bestaande muziekstijlen per biome, met een rustiger nachtstijl.

### 8.6 Klaar als
- Op de testpagina `?texturen` staan alle tegels, en een ouder vindt ze "net Minecraft".
- In de verte flikkert het niet meer (vergelijk screenshots op dezelfde plek, voor en na).
- Gras kleurt mee met het biome.
- De meetrit op de iPad is niet meer dan 5% langzamer dan na 4D.

### 8.7 Zo is het gebouwd (versie 4.4.0)
- Alle tegels zitten in één `DataArrayTexture` (één laag per tegel) met mipmaps; de mesher geeft per hoekpunt plek op de tegel en tegelnummer mee (`tuv`). Bladeren blijven in de verte zichtbaar doordat de shader hun doorzichtigheid laat afnemen met het mipmap-niveau, en doorzichtige pixels krijgen de gemiddelde kleur van de tegel (geen donkere randjes).
- Filter: per mipmap de dichtstbijzijnde pixel, zoals Minecraft. Zacht filteren maakte de meetrit op de testcomputer een derde trager (zie `metingen.md`).
- `js/engine/tint.js`: kleur van gras, blad en water per landschap, per kolom gemengd over 5 × 5. Gras, eikenbladeren, junglebladeren, varens, lianen en water worden grijs getekend; bij een grasblok bepaalt de doorzichtigheid van de laag dat alleen de grasrand kleurt. In de kist staan ze in de kleur van de vlakte.
- Nieuwe tekeningen in Minecraft-stijl (klein palet per tegel) voor gras, aarde, steen, planken, schors, bladeren (met gaatjes), zand, sneeuw, water en wol; de ertsen gebruiken de nieuwe steen. Testpagina: `?texturen`.
- Water golft in de shader (twee bewegende lagen). Onder water: blauwe mist dichtbij, een blauwe tint en gedempt geluid. Wolken: één plat vlak met een herhalend blokpatroon dat langzaam verschuift (één tekenopdracht).
- Brokjes bij slopen zijn stukjes van 4 × 4 pixels van de echte textuur. Voetstappen per ondergrond, druppels in grotten, golven bij de zee, overdag vogels en 's nachts een rustig nachtliedje.
- Niet gedaan: water dat op diepte donkerder wordt (dat vraagt water dat zonlicht tegenhoudt; komt eventueel later).

---

## 9. Fase 4F: blokken en bouwen

Doe dit in 2 PR's: **F1** blokken en natuurkunde, **F2** kist, hand en besturing.

### 9.1 Nieuwe blokken (±150)

| Groep | Blokken |
|---|---|
| Steen en ertsen | Graniet, dioriet, andesiet (ook gepolijst), grind, klei, ertsen (kolen, ijzer, koper, goud, lapis, redstone, diamant, smaragd), blokken van ijzer, koper, smaragd en lapis, stenen bakstenen (gewoon, mossig en gebarsten), gladde steen, kwarts, obsidiaan |
| Hout (5 soorten: eik, berk, spar, jungle, acacia) | Per soort: stam, planken, trap, plaat, hek, hekdeur en deur. Nu bestaan trap, hek, hekdeur en deur alleen van eik. |
| Andere trappen en platen | Keien, steen, stenen bakstenen, bakstenen, zandsteen en kwarts |
| Kleuren (16) | Wol (nu 10), tapijt, beton, terracotta, gekleurd glas (nu 5) en glazen paneel |
| Licht | Uit 4D: fakkel, lantaarn, gloeisteen, pompoenlantaarn en kampvuur. Nieuw: zeelantaarn |
| In huis | Werkbank, oven (gaat aan als je erop tikt en geeft dan licht), kist (gaat open en dicht), bed (4D), ladder, bloempot, jukebox (speelt een liedje), taart (tik: een hapje en hartjes), boekenkast (bestaat al) |
| Planten | Paardenbloem, klaproos, korenbloem, tulpen, zonnebloem (2 hoog), paddenstoelen, suikerriet, waterlelie, zeewier, koraal, en tarwe, wortels en aardappels die groeien |
| Water | Emmer met water |
| Feest | TNT, alleen met ouderinstelling (§14) |

### 9.2 Blokken met een stand
Blokken krijgen een stand afhankelijk van hoe Jippe ze zet. Zo werkt het nu ook al voor trap en deur.

- **Stam:** liggend of staand, afhankelijk van het vlak waarop je tikt.
- **Plaat:** onder, boven of dubbel (twee platen op elkaar worden één blok).
- **Trap:** ook ondersteboven, als je op de bovenste helft van een zijvlak tikt.
- **Fakkel:** tegen een muur of op de grond.
- **Glazen paneel en hekken** groeien vanzelf aan elkaar vast (hekken doen dat nu al).

Deze varianten krijgen elk een eigen id (zoals nu bij trap, deur en hekdeur), met `family` voor het blok in de kist. Met 16-bits id's is daar ruim plaats voor.

### 9.3 Natuurkunde (rustig en voorspelbaar)
- **Zand, rood zand en grind** vallen naar beneden als er niets onder zit (vallend blok als bewegend model).
- **Water stroomt** zoals in Minecraft: vanuit een bron 7 blokken ver opzij en altijd naar beneden. Twee bronnen naast elkaar maken een nieuwe bron. Emmer erin: een bron. Emmer erop: weghalen. Bijwerken in stapjes van 0,25 seconde, alleen in geladen chunks.
- **Plantjes** zonder grond eronder vallen om en springen als brokjes weg.
- **Gewassen** groeien in 4 stappen in ±5 minuten op geploegde aarde. Gras groeit langzaam over aarde.
- Alles wat de natuurkunde verandert, kan **niet** met de terug-knop worden teruggedraaid; alleen wat Jippe zelf deed. Uitzondering: TNT, zie §14.

### 9.4 Kist (inventaris) zoals Minecraft Creatief
- De onderbalk blijft 9 vakjes plus de kistknop (zoals nu).
- De kist krijgt tabbladen met een plaatje: **Bouwen**, **Kleuren**, **Natuur**, **Licht en huis**, **Planten**, **Stempels**, **Dieren** en **Portalen** (4H). Per tabblad een raster met grote vakjes en vegen om te scrollen.
- Families staan als één vakje in de kist. Een vakje dat je ingedrukt houdt, toont de varianten (bijvoorbeeld alle houtsoorten van een trap).
- **Blok kopiëren** (Minecraft's "pick block"): houd de kistknop ingedrukt en tik op een blok in de wereld; dat blok komt in je hand.

### 9.5 Hand en besturing
- **Hand met blok** in beeld (eerste persoon), rechtsonder. Beweegt zacht mee met lopen en zwaait bij bouwen en slopen. Een stempel of dier in de hand toont het plaatje.
- **Sprinten:** de stuurknop een seconde helemaal naar voren houden. De kijkhoek wordt iets breder en er komen stofwolkjes.
- **Sluipen:** de "omlaag"-knop ingedrukt houden terwijl je loopt. Je valt dan niet van een rand, zoals in Minecraft. Handig bij hoog bouwen.
- **Vliegen:** ook door twee keer snel op springen te tikken (de vliegknop blijft).
- **Zwemmen:** springen houden in water.

### 9.6 Klaar als
- Alle nieuwe blokken staan in de kist met een herkenbaar plaatje en kunnen worden gezet en gesloopt.
- Een stam ligt als je op een zijvlak tikt, twee platen worden één blok en een trap kan ondersteboven.
- Water stroomt 7 blokken en een emmer haalt het weer weg.
- Zand valt.
- Sluipen houdt je op een rand van 10 hoog.
- De oude blokken en id's werken nog in bewaarde werelden (§10).

### 9.7 Zo is deel 1 gebouwd (versie 4.5.0)
- Stempels, dieren en gereedschap uit de kist hebben nu id **60000+** (`ITEM_BASE`); blokken hebben ruimte tot 1024. Een bewaarde onderbalk met de oude nummers (200+) wordt bij het laden omgezet.
- ±370 nieuwe blok-id's (inclusief alle standen), met vaste nummers per familie in `blocks.js` (`stairsId`, `slabId`, `doorId`, `gateId`, `glassId`). Elk blok kan per richting een andere tegel hebben (oven met voorkant, liggende stam).
- Standen: stam liggend op een zijvlak, plaat onder/boven/dubbel (twee platen = het volle blok), trap ondersteboven, glazen panelen die aan elkaar groeien, oven en kist met de voorkant naar je toe, ladder tegen de muur.
- `js/engine/physics.js`: een wachtrij van vakjes rond elke verandering, elke 0,25 s een stapje (in echte tijd, ook op een trage iPad). Water stroomt 7 ver, valt naar beneden en twee bronnen maken een nieuwe bron; zand en grind vallen als bewegend blok; plantjes, fakkels, ladders en tapijt zonder steun vallen om; gewassen groeien in 4 stappen (±5 minuten); gras groeit over aarde. Water sloop je niet meer met de houweel: daar is de emmer voor.
- Niet gedaan in deel 1: TNT (zie §14), een bloempot mét bloem, en koraalblokken (alleen koraalplantjes).

### 9.8 Zo is deel 2 gebouwd (versie 4.6.0)
- **Families** (`FAMILIES` in `blocks.js`): stam, planken, trap (11 soorten), plaat (11), hek, hekdeur en deur (5 houtsoorten) en bed (10 kleuren) staan als één vakje met een hoekje in de kist. Ingedrukt houden (0,45 s) toont een rij met alle soorten, altijd binnen beeld. De kist heeft daardoor 256 vakjes in plaats van 293.
- **Blok kopiëren:** de kistknop 0,35 s vasthouden (hij licht op) en met een andere vinger op een blok tikken. Je krijgt de gewone soort (een omgekeerde trap wordt een trap, tarwe wordt tarwezaadjes). Lang vasthouden zonder te kopiëren opent gewoon de kist. Met de muis: middelste muisknop. De kistknop wordt nu één keer gemaakt, zodat hij blijft werken als de onderbalk verandert terwijl je hem vasthoudt.
- **Hand** (`js/hand.js`): een armpje met het blok (echte tegels) of een plaatje (plantje, stempel, dier, emmer), aan de camera vast en altijd bovenop getekend. Wiebelt bij lopen, zwaait bij bouwen en slopen, en krijgt het licht van de plek. Niet te zien van achteren, bij rijden, in de kist en in de meetrit (die blijft daardoor vergelijkbaar).
- **Sprinten:** joystick een seconde helemaal naar voren (of Ctrl): 1,6 × zo snel, kijkhoek 72° → 80°, stofwolkjes. **Sluipen:** omlaag-knop tijdens het lopen (die knop is er nu altijd, met de naam "Sluipen"): 0,35 × zo snel, de camera iets lager, en je loopt niet van een rand. **Vliegen:** twee keer springen binnen 0,3 s. **Zwemmen:** springen houden; nieuw is **duiken** met omlaag.
- **Na 4.6.0 (4.6.1 en 4.6.2), gevonden op de iPad:** de knop Meetrit bewaarde de wereld en ging meteen naar de meetpagina. Safari bewaarde de oude pagina met het bewaren half af, en de nieuwe pagina wachtte daarna eindeloos op de opslag (IndexedDB). Daardoor verscheen na 12 seconden "Deze iPad is te oud", en later "Werelden bewaard: 0". Opgelost: eerst alles bewaren en de opslag sluiten, dan pas naar de meetpagina; de meetrit gebruikt de opslag helemaal niet meer; de melding "te oud" komt alleen als het spel echt niet kan starten; reageert de opslag na 15 seconden nog niet, dan staat er "Sluit dit tabblad en open JippeCraft opnieuw". Het ouderscherm toont hoe lang het opstarten duurde.

### 9.9 Sneller maken (versie 4.7.0)
- De eerste meetrit op de iPad (10,2 inch, versie 4.6.2) gaf 38 fps: net onder het minimum van 40, wel gelijkmatig.
- 65% van de driehoeken lag in grotten onder de grond. Nieuw: per sectie van 16 × 16 × 16 berekent de mesher welke zijkanten via lucht, water of glas verbonden zijn (`sectionVis`), en de scene zoekt elk keer dat de camera een andere sectie in gaat welke secties je kunt zien (`cull`). Per chunk wordt alleen het stuk van de laagste tot de hoogste zichtbare sectie getekend. Op de testcomputer: 57% minder driehoeken, ±50% sneller, en hetzelfde beeld.
- De meetrit (zonder getal achter `?meet`) heeft vier extra rondjes van 8 seconden en meet het rekenwerk per beeldje. Zo laat één meting op de iPad zien of pixels, dieren of de hoeveelheid wereld het meeste kost.

---

## 10. Oude werelden (omzetten naar v4)

| Oud | Wordt |
|---|---|
| v1/v2/v3 in `localStorage` (96 × 96 × 48, `Uint8`) | Een **klassieke wereld** in v4. De 96 × 96 blokken komen in chunk 0–5 bij `x, z ≥ 0`, en elke `y` schuift 38 omhoog (oud zeeniveau 10 wordt nieuw zeeniveau 48). Daaronder komt steen, eromheen eindeloze zee. |
| Wereldsoort `island`, `flat`, `jungle`, … | Blijft als soort bewaard, voor muziek, lucht en dieren. Nieuwe chunks buiten het oude gebied zijn zee (bij Plat: een eindeloze platte wereld). |
| `adventure` | Klassieke wereld; nieuw kiezen kan niet meer (de Grote wereld vervangt hem) |
| Item-id's 200+ in de onderbalk en in dieren | Omzetten naar 60000+ |
| Dieren, tamme dieren, speler, album en instellingen | Worden 1-op-1 overgenomen; posities schuiven mee (y + 38) |

- Het omzetten gebeurt **één keer** per plek, bij de eerste start van v4. De oude sleutel in `localStorage` blijft staan als reserve en wordt niet meer geschreven.
- **Test:** `tests/fixtures/` krijgt een v3-bestand per wereldsoort (naast het bestaande `fase-2-v2.json`). De test controleert dat na het omzetten elk blok op dezelfde plek staat (met y + 38) en dat de speler op dezelfde plek begint.

---

## 11. Fase 4G: dieren en dorpen

### 11.1 Minecraft-dieren erbij

| Dier | Wat het doet |
|---|---|
| Koe | Graast en loeit; volgt je als je tarwe vasthoudt |
| Paard | In 6 kleuren. Temmen door 3 keer aaien, daarna erop rijden (snel). Gebruikt het bestaande rijsysteem. |
| Hond (wolf) | Temmen met een bot: hij volgt je, gaat zitten als je erop tikt en kwispelt |
| Kat | Woont in dorpen en komt spinnend naar je toe |
| Konijn | Huppelt en eet wortels |
| Vos | In de taiga; slaapt overdag, opgerold |
| Bij | Vliegt tussen bloemen en een bijennest. Prikt niet. |
| Geit | In de bergen; springt hoog |
| Lama | In de bergen, met een gekleurd kleedje |
| Vissen, dolfijn en inktvis | Zwemmen in zee en rivieren. Een dolfijn springt mee als je zwemt. |
| Dorpeling | In dorpen; loopt tussen huizen, zwaait en maakt het "hmm"-geluid, slaapt 's nachts in bed. Kleren laten zien wat hij doet (boer, bakker, bibliothecaris). |
| IJzergolem | Loopt door het dorp en geeft je soms een bloem |

### 11.2 Fokken (jonge dieren in de stal)
Geef twee dieren van dezelfde soort hun lievelingseten (tarwe, wortel of zaadjes). Er verschijnen hartjes en er komt een jong dier. Dat groeit in 10 minuten op. Dit was het optionele "baby's in de stal" uit fase 3. Werkt voor de boerderijdieren, paard, koe, konijn, leeuw (welpje) en tijger.

### 11.3 Rijden op meer dieren
Het rijsysteem uit 3D wordt algemeen: dieren met `rijdbaar: true` in `SPECIES`. Dat zijn het paard, de kameel, de olifant (langzaam en hoog), en de tamme cheetah (heel snel) en tijger. Vliegen met een papegaai op je schouder kan als extra, alleen als het snel lukt.

### 11.4 Waar dieren verschijnen
- **Per biome** een recept (tabel in §6.2).
- Bij het maken van een chunk wordt elk recept één keer geloot. In geladen chunks komen er heel langzaam dieren bij als het er te weinig zijn.
- **Nooit opgeruimd:** tamme dieren, dieren die Jippe zelf neerzette, dieren in een stal (binnen hekken) en dieren met een sticker in het album.
- De roofdieren en de regels voor stallen uit fase 3 blijven precies hetzelfde.

### 11.5 Dorpen
- Per regio (§5.4) een kans op een dorp, in Vlakte, Woestijn, Savanne, Taiga of Besneeuwde vlakte. In een Grote wereld ligt er altijd één binnen 300 blokken van de start.
- **Opbouw:** paden van aangestampte aarde, een waterput in het midden, 4–8 huisjes in de stijl van het biome (eik, zandsteen, acacia, spar of sneeuw), akkers met gewassen, lantaarnpalen, een klokje en een kerkje of bibliotheek.
- Dorpelingen, katten en een ijzergolem lopen rond. 's Nachts gaan de dorpelingen naar binnen en branden er lampen.
- **Bouwwerken als stempel:** het dorpshuis en de waterput komen ook als stempel in de kist.

### 11.6 Andere bouwwerken
Schipwrak op het strand of in ondiepe zee (met schatkist), mijnschacht in grote grotten (houten balken, lantaarns en rails om te bekijken) en een ruïne in het bos.

### 11.7 Klaar als
- In een Grote wereld vind je binnen 300 blokken een dorp met dorpelingen, een waterput en akkers.
- Twee gevoerde koeien krijgen een kalfje, en een welpje groeit op tot leeuw.
- Je kunt een paard temmen en erop rijden.
- Na wegvliegen en terugkomen staan de dieren in je stal er nog.
- Met 60 dieren binnen de simulatieafstand haalt de iPad nog minstens 40 beelden per seconde.

---

## 12. Fase 4H: extra werelden en portalen

### 12.1 Wereldsoorten in het menu
1. **Grote wereld:** alle biomen (de echte Minecraft-wereld), nu de standaard.
2. **Plat:** zoals Minecraft *Superflat*, om lekker te bouwen.
3. **Eiland:** één groot eiland in een eindeloze zee.
4. **Jungle, Woestijn, Toendra en Savanne** als **themawerelden**: eindeloos, met alleen biomen uit die familie.
   - Jungle: jungle, bamboebos, moeras, rivier en strand.
   - Woestijn: duinen, mesa, oase en droge rivier.
   - Toendra: sneeuwvlakte, sparrenbos, ijsbergen, bevroren zee en bergen.
   - Savanne: vlakte, plateau, waterpoel en een rivier met nijlpaarden.

### 12.2 Portalen (zoals de Nether in Minecraft)
- Elke wereldplek heeft een **hoofdwereld** (de soort die je bij "Nieuwe wereld" kiest) en kan daarnaast de 4 themawerelden als **extra wereld** hebben. Elke extra wereld heeft een eigen seed, afgeleid van die van de plek.
- **Portaal bouwen:** een rechthoekig frame van **portaalsteen** (minimaal 4 breed en 5 hoog, net als de Nether). Tik er met de **toverstaf** op. Het portaal vult zich met golvend licht, en de kleur hangt af van de portaalsteen:

  | Portaalsteen | Gaat naar |
  |---|---|
  | Groen | Jungle |
  | Geel | Woestijn |
  | Wit | Toendra |
  | Oranje | Savanne |

- **Portaal-stempel:** zet in één tik een kant-en-klaar portaal neer, voor als bouwen nog te moeilijk is.
- **Door het portaal lopen:** het beeld draait en vervaagt, er klinkt een magisch geluid en je staat in de andere wereld. Daar staat automatisch een portaal terug.
- **Je dier gaat mee:** als je op een dier rijdt of een tam dier je volgt, gaat het mee door het portaal.
- Het album en de onderbalk zijn voor de hele plek, dus voor alle werelden samen.
- In de opslag zitten de werelden in de chunksleutel (`slot1:jungle:cx:cz`, §5.6).

### 12.3 Ideeën voor later (niet in deze fase)
Wolkenland (zwevende eilanden), een onderwaterwereld, een dinowereld, een snoepwereld. Elk is een nieuw generator-recept plus portaalsteen in een nieuwe kleur.

### 12.4 Klaar als
- Je kunt een portaal bouwen en aansteken, er doorheen en weer terug.
- Elke themawereld is eindeloos en heeft zijn eigen dieren en muziek.
- Een tamme leeuw gaat mee door het portaal.
- Bewaren en laden werkt met meerdere werelden per plek.

---

## 13. Testen

### 13.1 Automatisch (bij elke PR, op GitHub)

| Soort | Voorbeelden |
|---|---|
| Unit (`tests/unit/`, gewone Node) | Ruis geeft dezelfde uitkomst per seed. Een chunk-hash per seed klopt. Licht-BFS: een fakkel geeft 14 en daalt met 1 per blok, en na weghalen is het weer 0. RLE over `Uint16` heen en terug. Omzetten van v3 naar v4. |
| Browser (Playwright, zoals nu) | Laden rond de speler. Bouwen op een chunkgrens. Bewaren en opnieuw laden (IndexedDB). Dag en nacht versneld. Fakkel geeft licht. Water stroomt. Portaal heen en terug. Dorp aanwezig op een vaste seed. Alle controles van fase 1–3. |
| Snelheid (op de computer) | De meetrit mag niet meer dan 15% langzamer worden dan bij de vorige fase. Generatie en mesher per chunk onder een vaste grens. |

Regels: wacht in tests met `waitForFunction` (nooit met vaste pauzes) en gebruik `?vast` voor een vaste beeldkwaliteit.

### 13.2 Op de iPad (na elke fase, door een ouder)
1. Open de site. Staat het juiste versienummer onderin het menu?
2. Doe `?meet` en maak een schermafbeelding van de uitkomst. Zet de cijfers in `docs/metingen.md`.
3. Speel 10 minuten: bouw een huis, vlieg ver weg en tik op de huisknop. Sluit Safari, open opnieuw: staat alles er nog?
4. Controleer wat in de fase nieuw is (zie "Klaar als" bij die fase).
5. Kijk of Jippe het zelf snapt zonder uitleg.

---

## 14. Keuzes (met de keuze die we aanhouden zolang niemand iets anders zegt)

| Vraag | Aanhouden |
|---|---|
| Dag en nacht standaard aan? | **Ja**, met een korte nacht die nooit pikdonker wordt. Ouders kunnen "altijd dag" kiezen. |
| Hoe kom je in de themawerelden? | Via het **menu** (als hoofdwereld) én via **portalen** vanuit elke wereld |
| Avontuur | Niet meer nieuw te kiezen (de Grote wereld vervangt hem); oude avontuurwerelden blijven speelbaar |
| Lava | **Nee.** Niet nodig voor portalen (portaalsteen staat in de kist), en "heet maar doet geen pijn" klopt niet |
| TNT | **Ja, maar uit** tot een ouder het aanzet. Ontploft zonder schade, met vuurwerk-effect. Wat het opblaast, kan met de terug-knop terug. |
| Monsters | **Nooit** |
| Maken met een werkbank (*crafting*) | Nee; alles staat in de kist. De werkbank is een decoratieblok. |
| Redstone-schakelingen | Nee (te ingewikkeld); het redstone-erts is alleen decoratie |
| Samen spelen (multiplayer) | Niet in fase 4 |
| Wereldrand | ±4.096 blokken: een zachte mistmuur met een vriendelijk geluid, je loopt er niet doorheen |
| Hoogte van de wereld | 128, terugvallen op 96 als de iPad het niet trekt |

---

## 15. Risico's

| Risico | Wat we doen |
|---|---|
| De nieuwe wereldmotor breekt bestaande dingen (deuren, stallen, jagen) | Dezelfde wereldfuncties houden. Alle tests van fase 1–3 moeten slagen. Speciale tests op chunkgrenzen. |
| De iPad wordt te traag | Eerst meten (4A). Zichtafstand automatisch aanpassen. Workers voor het zware werk. Tekenopdrachten samenvoegen per kolom. Na elke fase meten. |
| Safari gooit opslag weg | IndexedDB met `storage.persist()`, vaak automatisch bewaren, reservekopie in het ouderscherm. Als app op het beginscherm is de opslag het veiligst. |
| Het spel wordt te eng of te moeilijk | Minimale helderheid, korte nacht, geen monsters, huisknop. Na elke fase kijken of Jippe het zelf snapt. |
| Te veel tegelijk | Elke fase staat los, en sommige onderdelen zijn als "extra" aangeduid. Liever een kleinere fase die goed werkt. |
| Auteursrecht | Alles zelf getekend en zelf gemaakt. Geen Minecraft-bestanden of -geluiden. |

---

## 16. Afspraken per fase ("klaar" betekent)
1. Alle punten bij "Klaar als" zijn gehaald.
2. `npm run lint` en `npm test` slagen, ook op GitHub.
3. Bijgewerkt:
   - `sw.js`: nieuwe bestanden in `FILES`, en `CACHE` één versie hoger. Het versienummer in het menu volgt mee.
   - `README.md`: de tabel "Hoe speel je?".
   - `docs/README.md`: de status van de fase.
   - Dit plan: de fase afvinken in §3.
4. Een paar schermafbeeldingen van het nieuwe in de PR.
5. Een meting met `?meet` (computer, en de iPad zodra een ouder het heeft geprobeerd) in `docs/metingen.md`.
