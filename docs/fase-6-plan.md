# Fase 6: De Wilde Nacht

Een spannende spelstand: overdag bouw je zo snel mogelijk een huis, want als het donker wordt komen alle dieren op je af. Elke nacht wordt moeilijker. Op verzoek van de ouders is dit bewust **eng**: donker, enge geluiden, dieren die je achterna zitten, muren slopen en je raken. Er is geen bloed en Jippe gaat niet dood in beeld; "gepakt" is het einde van de ronde.

De afspraak uit de eerdere fases ("geen geweld, geen monsters, geen schade aan de speler") geldt nog steeds voor de rest van het spel. Alleen in de Wilde Nacht kun je hartjes verliezen, en die stand kies je zelf in het menu.

## 1. Zo gaat een ronde

1. **Dag (bouwen).** Een klok telt af, de zon zakt. De dieren staan in een kring in de verte en staren naar je. Op 10 seconden: "Nog tien tellen!", tikken en aftellen. Het spel kijkt of je huis dicht is en laat een gat glinsteren.
2. **Nacht (2 minuten).** Het wordt donker en de dieren rennen op je af. Raakt er een je, dan ben je een hartje kwijt, word je weggeduwd, flitst het scherm rood en schudt het beeld.
3. **Gepakt.** Alle 5 hartjes op: zwart-rood scherm "Je bent gepakt!" met **Nog een keer** of **Stoppen**.
4. **Overleefd.** De zon komt op, vuurwerk, de dieren rennen weg: **Volgende nacht** of **Stoppen**. Je huis blijft staan (met de schade), je krijgt 2 hartjes terug.

## 2. Welke dieren wat doen (6C)

| Groep | Dieren | Wat ze doen |
|---|---|---|
| Sluipers | kip, konijn, kat, vos, stokstaartje | slopen niets, glippen door elk gat van 1 blok, snel |
| Springers en klimmers | geit, aap, kikker, raptor | springen 2 hoog of klimmen; slopen niets |
| Vliegers | papegaai, sneeuwuil, pteranodon | komen van boven: zonder dak ben je kwetsbaar; duwen je van een toren af |
| Beukers | varken, koe, ijsbeer, nijlpaard | slopen zacht materiaal (glas, aarde, zand, bladeren) |
| Rammers | olifant, neushoorn, triceratops | slopen ook hout |
| Sloper | T-rex | sloopt alles behalve ijzer en obsidiaan |

Sterkte van blokken (aantal beuken): glas 1, aarde/zand/bladeren 2, hout 4, steen 8, baksteen 10, ijzer en obsidiaan nooit. Je ziet scheurtjes bij elke beuk.

## 3. Torens en andere trucs

- **Hoge toren:** vliegers duiken op je af en duwen je opzij; klimmers en springers komen omhoog; beukers slopen de onderste blokken en dan **stort de toren in** (blokken zonder steun vallen naar beneden, zoals zand). Vallen van 4 blokken of hoger kost een hartje. Alleen een brede, stevige toren met een dak houdt het vol.
- **Vliegen** kan niet, **stempels** doen niet mee, je kunt **geen dieren neerzetten**, niet **slapen**, niet **rijden**, niet **naar huis** en niet door een **portaal**.
- Te ver weglopen kan niet: na 44 blokken is de mist te dik.
- Een gracht mag, maar tijger, ijsbeer en nijlpaard zwemmen.

## 4. Steeds moeilijker (6D)

| Nacht | Wat er verandert |
|---|---|
| 1 | 8 dieren: sluipers en beukers; 90 s bouwen |
| 2 | 10–12 dieren, springers erbij, sneller |
| 3 | vliegers erbij: nu heb je een dak nodig |
| 4 | rammers erbij (slopen hout) |
| 5 | de T-rex; schrikmomenten bij het raam |
| 6+ | elke nacht meer en snellere dieren, kortere dagen; ze zoeken de zwakste plek in je muur |

Binnen een nacht komen de dieren in golven die steeds feller worden.

- **Beperkte bouwstenen:** je begint met een stapel hout, steen en een paar blokken ijzer. Elke overleefde nacht verdien je meer en beter materiaal.
- **BOE-knop:** tik met een fakkel op een dier: het schrikt en rent een stukje weg (met een lange oplaadtijd).
- **Record:** hoeveel nachten je het langst volhield.

## 5. Eng maken (6B)

- Echte nacht met een rode maan en mist; alleen fakkels geven licht.
- Gloeiende rode ogen en boze wenkbrauwen op elk dier, ook van ver te zien.
- Grommen, krabben en bonken op de muur (links of rechts te horen), een hartslag als ze dichtbij zijn, een lage dreigende muziek die per golf harder wordt.
- Schrikmomenten: een dier dat plots voor het raam opduikt met een brul.

## 6. Delen

| Deel | Wat | Versie |
|---|---|---|
| **6A** | Aparte wereld, dag- en nachtronde, hartjes, dieren jagen, raken, wegduwen, gepakt of overleefd, vallen kost een hartje, vliegen/stempels/rijden uit, controle of het huis dicht is, record | **6.0.0 (klaar)** |
| **6B** | Eng maken: ogen, gezichten, rode maan, mist, geluid, hartslag, schrikmomenten | **6.1.0 (klaar)** |
| **6C** | Slopen: blokken met kracht en scheurtjes, beukers, rammers, instortende torens, vliegers, klimmers, BOE-knop | **6.2.0 (klaar)** |
| 6D | Steeds moeilijker: golven, de T-rex, beperkte bouwstenen als beloning, stickers | 6.3.0 |

## 7. Zo is 6A gebouwd (versie 6.0.0)

- **`storm.js`**: de klasse `Storm` regelt de ronde (fases `dag`, `nacht`, `ochtend`, `gepakt`, `overleefd`), de klok, de hartjes, het jagen en het raken, de knockback, valschade, de grens van 44 blokken, de balk bovenin en het eindbord. `nightPlan(n)` zegt per nacht hoe lang je mag bouwen, hoeveel en welke dieren komen en hoe snel ze zijn. `houseCheck()` kijkt vanaf de speler welke lege vakjes bereikbaar zijn (een open deur telt als gat); kom je ver weg, hoog boven of diep onder uit, dan is het huis open, en het vakje bij het gat glinstert.
- **Aparte wereld**: een nieuw eiland (willekeurige seed) dat nooit bewaard wordt (`saveNow` doet niets zolang `game.storm` bestaat). Daarvoor wordt de eigen wereld eerst bewaard; bij **Stoppen** (of het menu) laadt het spel die weer. Er verschijnen geen gewone dieren, en de roofdieren jagen niet op elkaar.
- **Dieren**: `Animal.chaseSpeed` laat ze rennen (sneller dan lopen, de leeuw sneller dan Jippe, het varken langzamer). Overdag staan ze stil en kijken naar je; 's nachts rennen ze op je af en proberen ze opzij als ze vastlopen. Een dier raakt je alleen als er geen blok tussen zit.
- **Uit tijdens de Wilde Nacht**: vliegen, stempels, dieren neerzetten, ei uitbroeden, voertuigen, aaien en voeren, dieren naar huis sturen, slapen, de huisknop en portalen.
- **Menu**: een knop **Wilde Nacht** (maan met rode ogen) naast Roofdieren jagen.
- Tests: `tests/unit/wildenacht.test.mjs` (huis dicht of open, deuren, steeds moeilijker) en `FASE=6a npm run test:browser`.

## 8. Zo is 6B gebouwd (versie 6.1.0)

- **Rode ogen en boze wenkbrauwen** (`addEyes` in `storm.js`): elk dier van de Wilde Nacht krijgt twee rode oogjes op de voorkant van zijn kop, een rode gloed eromheen en schuine wenkbrauwen. Ze doen niet mee met het licht en de mist, dus je ziet ze in het donker en van ver.
- **Donker, rood en mist** (`scene.setStorm(level)`): als de avond valt wordt het al een beetje eng, 's nachts helemaal. Het maanlicht wordt veel zwakker en rood (binnen zonder fakkel is het pikdonker), de lucht is donkerrood, de mist komt dichtbij (30 blokken), de maan is rood en groter, de sterren verdwijnen bijna. Een donkere rand om het beeld (`.storm-vignette`) flitst rood bij elke hartslag.
- **Geluid** (`audio.js`), allemaal links of rechts te horen, afhankelijk van waar het dier staat:
  - grommen: overdag af en toe uit de verte, 's nachts vaak;
  - krabben en bonken: een dier vlak achter je muur (het beeld trilt even bij een bonk);
  - hartslag: als er een dier binnen 10 blokken is, sneller naarmate het dichterbij komt;
  - een lage, dreigende bromtoon die tijdens de nacht steeds harder wordt (het gewone muziekje is uit);
  - een harde brul als je gepakt wordt.
- **Schrikmomenten**: om de 22 tot 40 seconden. Kijk je naar een raam (glas), dan staat er ineens een dier voor, met zijn kop tegen het glas, met een brul en een schok in beeld. Geen raam maar wel binnen: een brul en een klap tegen de muur.
- Tests: `FASE=6b npm run test:browser`.

## 9. Zo is 6C gebouwd (versie 6.2.0)

- **Welke dieren komen wanneer** (`nightPlan`): nacht 1 varken, koe, kip, konijn en vos; nacht 2 erbij geit, aap en leeuw; nacht 3 papegaai, sneeuwuil, tijger en ijsbeer; nacht 4 olifant, triceratops, pteranodon en raptor; nacht 5 de T-rex.
- **Slopen**: een sloper die tegen een blok aan staat dat hem in de weg zit, beukt erop (ongeveer elke seconde; latere nachten sneller). `blockStrength`: glas 1, aarde/gras/zand/bladeren/wol 2, hout 4, steen 8, bakstenen 10, ijzer en obsidiaan (en de bodem) nooit. `BASHERS`: varken, koe, ijsbeer en nijlpaard slopen tot 2, olifant en triceratops tot 4 (hout), de T-rex tot 10. Bij elke beuk een bonk (links/rechts), brokjes, het beeld trilt, en scheurtjes op het blok (vier standen). Een deur gaat in zijn geheel kapot.
- **Repareren**: sloopt Jippe een beschadigd blok en zet hij er een nieuw neer, dan is het weer helemaal heel (`storm.repaired`, vanuit `game.apply`). Wat de dieren kapot maken, kun je niet met de terug-knop terugzetten.
- **Instortende torens** (`looseBlocks`, `physics.drop`): is er een blok weggeslagen, dan kijkt het spel of wat erboven zit nog ergens steun heeft op de hoogte van het gat of lager. Zo niet, dan valt het om: elk blok valt in de richting waarin het dier duwde, hoe hoger hoe verder opzij. Een muur met een gat en een brede toren met één weggeslagen poot blijven staan; een smalle toren valt om, en Jippe valt mee (vallen van 4 blokken kost een hartje).
- **Springers** (geit, kikker, raptor) springen over een muur van 2 hoog; **klimmers** (aap) klimmen tegen muren op. Dieren die op je afrennen springen ook van een muur af (normaal blijven dieren van randen weg).
- **Vliegers** (papegaai, sneeuwuil, pteranodon) vliegen recht op je af als er niets tussen zit; anders cirkelen ze 5 blokken boven je. Zonder dak duiken ze naar binnen. Ze raken je alleen als er geen blok tussen zit, ook van boven: een dak beschermt dus.
- **Sluipers** (kip, konijn, vos, kat, stokstaartje) durven niet binnen 3 blokken van een fakkel, lantaarn of lamp te komen.
- **BOE-knop** (links, boven de stuurknop): alle dieren binnen 7 blokken schrikken en rennen 4 seconden weg, met vuurvonkjes en "Boe!". Daarna moet de knop 15 seconden opladen (je ziet een klok rondlopen; als hij klaar is, gloeit hij).
- Tests: `tests/unit/wildenacht.test.mjs` (sterkte, wie wat sloopt, omvallende torens) en `FASE=6c npm run test:browser` (slopen, repareren, toren, geit en aap, vliegers, fakkel, BOE).
