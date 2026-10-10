# Fase 5: de Dinowereld en meer te doen

Fase 4 maakte van JippeCraft een echte Minecraft-wereld. In fase 5 komt er een nieuwe wereld bij, de **Dinowereld**, en krijgt Jippe meer **te doen**: opdrachtjes met stickers, schatkisten met verkleedkleren, een karretje op rails, een bootje, en knoppen en hendels die deuren en lampen bedienen.

Zoals altijd: alles in het Nederlands, groot en duidelijk voor een kind van 6, niets engs (geen monsters, geen lava, niemand gaat dood), alles met de terug-knop terug te zetten wat Jippe zelf bouwt, en het moet vlot blijven op de iPad.

## 1. Volgorde

| Deel | Wat | Versie |
|---|---|---|
| **5A** | Dinowereld: eigen landschappen, dino's, dino-eieren, rode portaalsteen | 5.0.0 ✅ |
| **5B** | Opdrachtjes en stickers, met voorlezen | 5.1.0 ✅ |
| **5C** | Schatkisten en verkleden | 5.2.0 |
| **5D** | Rails en karretje, bootje | 5.3.0 |
| **5E** | Knoppen, hendels, drukplaten en lampen | 5.4.0 |

Elk deel krijgt tests (unit en browser), docs, een eigen versie en een push, net als in fase 4.

## 2. Fase 5A: de Dinowereld

### 2.1 De wereld
- Een nieuwe themawereld `dino`, eindeloos, met het klimaat uit fase 4H (zoals de Jungle). Je komt er via **rode portaalsteen** en kunt hem ook in het menu kiezen als nieuwe wereld.
- Landschappen:
  - **Varenvlakte** (start): gras met varens, paardenstaarten en hier en daar een palmvaren. Hier lopen de grote dino's in kuddes.
  - **Oerbos**: boomvarens, apenbomen (hoge stam met platte kruin) en reuzenvarens, met mos op de grond.
  - **Vulkanen**: hoge, donkere bergen van basalt met gloeiende magmasteen en rookpluimen. Geen lava: de magmasteen geeft alleen licht en is niet heet.
  - **Moeras**, **rivier**, **strand** en **zee** zoals in de andere werelden.
- Onder de grond liggen **fossielen** (zoals erts), en in de Varenvlakte en het Oerbos liggen **dinonesten** met eieren.

### 2.2 Nieuwe blokken
Basalt, magmasteen (geeft licht), mos, varenstam en varenkruin, apenboomstam en -bladeren, reuzenvaren (2 hoog), paardenstaart, fossiel, barnsteen (doorzichtig oranje) en het **dino-ei** (3 kleuren). In de kist onder Natuur, sectie "Dinowereld".

### 2.3 Dino's (allemaal vriendelijk)

| Dino | Wat hij doet |
|---|---|
| T-rex | Groot en snel; tam te maken en te berijden. Brult (vriendelijk). |
| Brachiosaurus | Heel lange nek, eet bladeren uit de bomen; te berijden (langzaam en hoog). |
| Triceratops | Drie hoorns, loopt in een kudde; te berijden. |
| Stegosaurus | Platen op de rug, loopt in een kudde. |
| Parasaurolophus | Toetert met zijn kam, loopt in een kudde. |
| Pteranodon | Vliegt rond. |
| Velociraptor | Klein en snel; tam te maken en volgt je dan, zoals de hond. |

- **Dino-ei:** tik op een ei en er komt een jonge dino uit, die opgroeit. Eieren staan in nesten en in de kist.
- **Fokken:** dino's eten graag zaadjes, wortels en aardappels, net als de andere dieren.
- Album en kist krijgen een groep "Dino's".

### 2.4 Klaar als
- Je kunt door een rood portaal naar de Dinowereld en weer terug.
- De Dinowereld heeft de 3 landschappen, dino's, nesten en fossielen.
- Een ei uitbroeden geeft een jonge dino; een T-rex kun je temmen en berijden.

### 2.5 Zo is het gebouwd (versie 5.0.0)
- `climate.js`: thema `dino` (bergen zijn vulkanen: waar het klimaat bergachtig is, ligt het landschap Vulkanen). De start ligt altijd in de Varenvlakte, zonder vulkaan binnen 45 blokken.
- `gen.js`: vulkanen van basalt met magmasteen (hoger = meer), planten van twee blokken hoog (`boven`), fossielen en barnsteen bij de ertsen, mijnschachten ook in de Dinowereld. Bij de start liggen een dinonest en een opgraving (kuil met ladder en fossielen); verderop meer.
- Bomen: boomvaren, apenboom en palmvaren (`trees.js`). Weer: grijze as bij de vulkanen; rookwolken uit de magmasteen bovenop de bergen.
- `animals/dinos.js`: de zeven modellen; `zadel` in de soort bepaalt hoe hoog je zit (en de camera gaat mee omhoog). De Brachiosaurus eet bladeren uit de bomen (`bladeren`).
- Portaalsteen heeft nu een eigen id per kleur (`PORTAL_COLORS[i].stone` en `.portal`), zodat er kleuren bij kunnen.
- De textuuratlas heeft nu meer dan 256 tegels: de texture-array mag tot 2048 lagen op de iPad (een waarschuwing in de console als een toestel minder kan).

## 3. Fase 5B: opdrachtjes en stickers

- Ongeveer 30 **opdrachtjes**, in groepjes: Bouwen, Dieren, Ontdekken, Werelden, Dino's, Rijden en Schatten. Bijvoorbeeld:
  - zet een bed in een huis;
  - aai 5 verschillende dieren;
  - rijd op een paard;
  - vind een dorp;
  - ga door een portaal;
  - laat een dino-ei uitkomen;
  - open een schatkist;
  - rijd in het karretje.
- Elk opdrachtje geeft een **sticker** (een plaatje). De stickers staan in het boek (het album), op een nieuw tabblad **Stickers**.
- **Voorlezen:** Jippe kan nog niet alles lezen. Tik op een sticker en de iPad leest het opdrachtje voor (de Nederlandse stem van de iPad). Een knop **"Wat zal ik doen?"** kiest een opdrachtje dat nog niet gedaan is en leest het voor.
- Een opdrachtje af: een grote sticker vliegt in beeld met een vrolijk geluid, en de iPad zegt "Goed zo!".
- De stickers zijn van Jippe, in alle werelden samen. Ouders kunnen ze in het ouderscherm leegmaken.

### Klaar als
- Opdrachtjes worden vanzelf afgevinkt als Jippe het doet.
- De stickers staan in het boek; voorlezen werkt; "Wat zal ik doen?" kiest een opdrachtje.

### Zo is het gebouwd (versie 5.1.0)
- `quests.js`: de lijst met opdrachtjes. Elk opdrachtje luistert naar één melding van het spel (`place`, `ride`, `near`, `hatch`, ...) en telt hoe vaak, of hoeveel verschillende (`soorten`). `main.js` meldt het met `note()`; elke seconde kijkt het spel ook waar Jippe is (hoogte, onder water, welk landschap, welk bouwwerk in de buurt).
- De stickers bewaren we in de instellingen (`settings.stickers`), dus ze gelden voor alle wereldplekken samen.
- `speech.js`: voorlezen met de Nederlandse stem van de iPad (`speechSynthesis`). Staat het geluid uit, dan leest hij niet voor.
- Het boek (`album.js`) heeft tabbladen Dieren en Stickers; leegmaken kan per tabblad. Komen een sticker en een nieuw dier tegelijk, dan verschijnen ze na elkaar.

## 4. Fase 5C: schatkisten en verkleden

- **Schatkisten** liggen in tempels, piramides, iglo's, schipwrakken, ruïnes, mijnschachten, dorpen en dinonesten. Tik erop: de kist gaat open met glitters en je vindt iets om aan te trekken.
- **Verkleden:** een nieuw tabblad **Verkleden** in het boek. Je kiest:
  - een hoed: pet, kroon, piratenhoed, cowboyhoed, tovenaarshoed, ridderhelm, dino-kap of bloemenkrans;
  - een cape: rood, blauw of regenboog;
  - de kleur van je shirt en broek.
- De pet en alle kleuren heb je meteen. De rest vind je in schatkisten (en een paar krijg je met een sticker). Heb je alles al, dan zit er goud in de kist.
- Je ziet je kleren als de camera achter je hangt, en ook als je rijdt.

### Klaar als
- Schatkisten liggen in de bouwwerken en geven een kledingstuk.
- Verkleden werkt en blijft bewaard.

## 5. Fase 5D: rails, karretje en bootje

- **Rails:** leg ze neer en ze sluiten vanzelf op elkaar aan: recht, in een bocht of schuin omhoog (zoals in Minecraft).
- **Karretje:** zet het op de rails, tik erop en je zit erin. De stuurknop naar voren rijdt vooruit, naar achteren rijdt achteruit. Het karretje volgt de bochten en gaat de helling op en af. Aan het eind van de rails stopt het.
- **Bootje:** zet het op het water, tik erop en vaar met de stuurknop. Op het land komt het niet vooruit.
- Karretje en bootje bewaren mee met de wereld en gaan mee door een portaal als je erin zit.

### Klaar als
- Een rondje rails met bochten en een helling werkt met het karretje.
- Varen met het bootje werkt; uitstappen met de knop (zoals bij een dier).

## 6. Fase 5E: knoppen, hendels, drukplaten en lampen

- **Hendel:** tik erop en hij gaat om (aan of uit).
- **Knop:** tik erop en hij is even aan (2 seconden).
- **Drukplaat:** aan zolang er iemand op staat (Jippe of een dier).
- Wat aangaat binnen 4 blokken: **deuren en hekken** gaan open, **lampen** gaan aan (een nieuwe lamp die uit en aan kan). Uit is weer dicht.
- Zo maakt Jippe een deur die vanzelf opengaat, of een lamp met een knopje. Simpeler dan redstone: er zijn geen draden nodig.

### Klaar als
- Een hendel opent een deur en zet een lamp aan; uit doet ze weer dicht en uit.
- Een drukplaat voor een deur opent die als je erop gaat staan.

## 7. Testen
- **Unit:** generator van de Dinowereld (per seed hetzelfde, landschappen aanwezig), opdrachtjes (afvinken en bewaren), rails (de vorm past zich aan de buren aan), knoppen (wat binnen bereik aan en uit gaat).
- **Browser:** door het rode portaal en terug; ei uitbroeden; T-rex temmen en berijden; een opdrachtje halen en de sticker zien; schatkist openen en verkleden; rondje met het karretje; varen; hendel met deur en lamp.
- Na elk deel: lint, unit, de volledige browsertests, en CI groen.

## 8. Afspraken
- Elke deel krijgt een eigen versie; de iPad-meetrit blijft werken.
- Bewaarde werelden blijven werken: alleen nieuwe blokken en velden erbij.
- Geen geweld, geen monsters, geen lava.
