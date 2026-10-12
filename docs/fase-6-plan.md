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
| **6D** | Steeds moeilijker: golven, de T-rex, beperkte bouwstenen als beloning, stickers | **6.3.0 (klaar)** |

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

## 10. Zo is 6D gebouwd (versie 6.3.0)

- **Golven**: de dieren van een nacht komen in drie golven. De eerste (40%) staat overdag al in de kring te staren; de tweede komt na een derde van de nacht, de derde na twee derde. Elke golf is 12% sneller dan de vorige, en latere golven krijgen de nieuwere, gevaarlijkere soorten van die nacht. Bij een nieuwe golf: een brul, het beeld schudt, "Golf 2!", en de balk bovenin zegt "golf 2/3".
- **Je eigen bouwstenen** (`STOCK_ITEMS`, `START_STOCK`): in de Wilde Nacht staat in de onderbalk alleen aarde, planken, keien, bakstenen, glas, ijzer, obsidiaan, een deur en fakkels, met hoeveel je er hebt. Je begint met 24 aarde, 30 planken, 10 keien, 4 glas, 1 deur en 3 fakkels. Bouwen kost een blok; is een soort op, dan wordt het vakje grijs en kun je er niet meer mee bouwen. Slopen geeft het blok terug (gras of aarde geeft aarde, steen geeft keien, een boomstam 2 planken). De kist met alle blokken, blok kopiëren en de terug-knop doen niet mee.
- **Beloning** (`nightReward`): na elke overleefde nacht verdien je nieuwe bouwstenen, en het bord laat zien welke. Nacht 1: planken, keien, glas en fakkels; nacht 2: keien, bakstenen, 2 ijzer en een deur; nacht 3: bakstenen, 4 ijzer, fakkels en planken; nacht 4: 6 ijzer, 2 obsidiaan en keien; daarna steeds ijzer, obsidiaan en bakstenen. Zo kun je je huis elke nacht sterker maken, net op tijd voor de rammers (nacht 4) en de T-rex (nacht 5).
- **Stickers** (groep Wilde Nacht, 46 stickers in totaal): je eerste nacht overleefd, drie nachten, vijf nachten (de T-rex), een dier weggejaagd met de BOE-knop, en een kapot geslagen blok vervangen.
- Niet gedaan: dieren die bewust de zwakste plek in je muur zoeken. Een sloper die tegen een te sterk blok aanloopt, probeert het wel vanzelf even opzij, en komt zo vaak bij een zwakkere plek.
- Tests: `FASE=6d npm run test:browser`.

## 11. Na het testen op de iPad (versie 6.3.1)

- Het was net te donker, en als je omhoog keek zag je vlakken donkerblauw (de wolken) en vlakken zwart (de lucht). Nu zijn de lucht, de wolken en de mist allemaal donkerblauw, en de nacht is lichter: het maanlicht is nog maar een kwart zwakker dan in een gewone nacht (was veel donkerder en rood), de mist begint verder weg (38 blokken) en de donkere rand om het beeld is minder sterk. De rode maan en de rode ogen blijven.

## 12. Natuurlijker bewegen (versie 6.4.0)

Voorheen stonden de dieren stil en liepen ze meteen op volle snelheid, kozen ze zomaar een nieuwe richting (soms bijna achteruit), draaiden ze ter plekke, botsten ze tegen muren voordat ze omkeerden, bewogen alleen hun poten, en deden ze weinig als ze stilstonden. Nu (in `animals/core.js`):

1. **Optrekken en afremmen** (`speedCur`): een dier komt rustig op gang en loopt even uit. Bij haast (jagen, vluchten, de sprint van de cheetah, volgen, de Wilde Nacht) trekt het snel op en draait het scherp.
2. **In een boog naar een doelplek** (`goal`, `pickGoal`): een dier kiest een plekje een paar blokken verderop (meestal ongeveer vooruit) en loopt er met een lichte slinger naartoe. Draaien gaat hoogstens 2,4 radialen per seconde, dus in een boog in plaats van ter plekke.
3. **Vooruit kijken** (`lookAhead`, `pathClear`): vier keer per seconde kijkt een lopend dier of de weg vrij is (een opstapje van één blok mag; een muur, een afgrond of water niet, behalve voor zwemmers; een vis kijkt of er water is). Zo niet, dan buigt het op tijd af (het ene dier liever links, het andere rechts), of stopt het en keert om. Botst het toch, dan remt het af en gaat het opzij, niet ineens achteruit.
4. **Een levend lijf**: het lijf deint mee met de stappen, de kop knikt mee, een dier leunt in de bocht en kantelt bij een sprong; hoe sneller, hoe snellere en grotere passen (stappen, draven, rennen).
5. **Rustgedrag**: om zich heen kijken, de kop naar Jippe draaien als die binnen 6 blokken staat, de staart rustig laten zwiepen met af en toe een snelle zwiep, snuffelen tijdens het grazen, en af en toe even gaan liggen (6 tot 14 seconden).
6. **Groepjes**: koeien, schapen, varkens, kippen, geiten, lama's, paarden, zebra's, rendieren, pinguïns, olifanten, giraffen, kamelen, stokstaartjes en plantenetende dino's lopen naar hun kudde als ze er te ver vandaan zijn (`HERD`). Een jong dier loopt achter zijn moeder aan (ook voordat het gaat slapen). Vissen zwemmen in een school: dezelfde kant op als de vissen om hen heen, en bij elkaar.

- 's Nachts gaan kuddedieren slapen waar ze zijn (alleen een jong dier zoekt dan nog zijn moeder op), en een jong dier loopt iets sneller als het zijn moeder achterna gaat (versie 6.4.1).
- De zware dingen (vooruit kijken, kudde zoeken) gebeuren een paar keer per seconde, niet elk beeldje; ver weg blijven de dieren één stuk (zoals voorheen).
- Tests: `FASE=6e npm run test:browser`. De cheetah-test in fase B is aangepast: de sprint haalt 9 blokken per seconde na een korte aanloop, en daarna remt hij af tot hij weer stapt.

## 13. Graven naar een kelder (versie 6.4.2)

Op de iPad bleek een kelder onder de grond helemaal veilig: de dieren gingen er bovenop staan en konden niets. Nu graven ze naar beneden als Jippe recht onder ze zit (`digCell` in `storm.js`):

- Slopers graven met dezelfde kracht als waarmee ze muren slopen: varken, koe, ijsbeer en nijlpaard door aarde, gras en zand, olifant en triceratops ook door hout, de T-rex zelfs door steen.
- Nieuwe **gravers** (`DIGGERS`): konijn, vos en stokstaartje graven door aarde, gras en zand (maar slopen geen muren).
- Een dier graaft alle blokken onder zijn lijf weg (eerst het blok het dichtst bij Jippe), tot het naar beneden valt. Hangt het met zijn midden boven een gat maar steunt een hoek nog op iets sterks (de rand van een stenen muur), dan glijdt het opzij. Staat het midden op iets dat te sterk is, dan lukt het niet.
- Graven klinkt als krabbelen (links of rechts te horen), met brokjes en scheurtjes.
- Zo is een kelder met een **stenen dak** veilig tegen bijna alles, behalve de T-rex; ijzer en obsidiaan houden alles tegen.
- Test: `FASE=6c npm run test:browser` (kelder met een dak van aarde: varken en konijn komen erin; dak van steen: het varken niet).
- 's Nachts gaan de dieren sneller slapen, ook midden in een wandeling (versie 6.4.3).
- Een jong dier dat al bij zijn moeder is, wandelt alleen een stukje om haar heen (hoogstens 3 blokken), in plaats van tot 9 blokken weg (versie 6.4.4).

## 14. Niet wegvegen in Safari (versie 6.4.5)

In Safari ging je terug naar de vorige website als je vanaf de rand van het scherm veegde, en de joystick verschijnt juist waar de duim neerkomt. `js/guard.js`: een aanraking die bij de rand van het speelveld begint, wordt geen veeggebaar meer, en lukt terugvegen toch, dan blijf je in het spel (een extra stap in de geschiedenis). Als app op het beginscherm kan het helemaal niet; het ouderscherm laat zien hoe het spel geopend is. Test: `FASE=6f npm run test:browser`.

## 15. Sneller slopen en graven, en vlotter op een oudere tablet (versie 6.5.0)

**Slopen en graven.** Een sloper sloeg alleen het blok recht voor zijn neus kapot. Daarna was het gat te klein voor zijn lijf, en kwam hij nooit binnen. Nu (`blocker` in `storm.js`):

- Een sloper kijkt welke blokken zijn hele lijf tegenhouden als hij een stapje naar Jippe toe zet, en beukt die één voor één weg (eerst onderaan, dan het dichtst bij de lijn naar Jippe), tot hij erdoor past. Zit er iets tussen dat te sterk voor hem is, dan probeert hij eromheen te lopen. Een opstapje van één blok beukt hij niet weg: daar springt hij op.
- Gravers (konijn, vos, stokstaartje) graven zo ook **opzij** een gang door aarde, gras en zand, niet door hout, steen of glas.
- Sneller: om de 0,45 seconde een beuk tegen een muur, om de 0,3 seconde graven in de grond (nacht 1; latere nachten sneller). Grote dieren beuken harder (`hitPower`): een olifant heeft 2 beuken nodig voor hout, de T-rex 3 voor steen. Door aarde graaf je in één keer.
- Gemeten in de testbrowser: een varken komt in 3 s door een huis van aarde (voorheen nooit), een olifant in 10 s door hout, de T-rex in 23 s door steen; naar een kelder met een dak van aarde: varken 4 s (was 17 s), konijn 2,6 s (was 10 s).

**Vlotter.** Gemeten: het rekenwerk van de Wilde Nacht is klein (minder dan 0,3 ms per beeldje), het tekenen kost het meest. Daarom:

- De zichtafstand is in de Wilde Nacht hoogstens 3 chunks (48 blokken): verder kijk je door de dichte mist toch niet heen. Na het stoppen komt de oude zichtafstand terug.
- Dieren verder dan 14 blokken worden als één stuk getekend (gewoon pas na 28 blokken); in het donker en de mist zie je vooral hun ogen.
- Ogen en wenkbrauwen zijn samen één vorm, met één gloed om beide ogen: 2 tekenopdrachten per dier in plaats van 6.
- De rode rand bij de hartslag verandert alleen nog van doorzichtigheid (eerst werd de wazige rand elke keer helemaal opnieuw getekend), en de klok op de BOE-knop wordt alleen bijgewerkt als hij echt verder is.
- Samen: ongeveer 125 tot 145 tekenopdrachten in plaats van 160 tot 210.

## 16. Elke nacht sneller graven, en vanaf nacht 3 door steen (versie 6.6.0)

Op de iPad groef Jippe snel 5 tot 10 blokken naar beneden. Onder 4 blokken aarde zit steen, en daar kwam (behalve de T-rex) geen dier doorheen: diep in de grond was je dus altijd veilig. Nu:

- **Elke nacht sneller graven** (`plan.dig` in `nightPlan`): nacht 1 gewoon, nacht 2 1,4 keer zo snel, nacht 3 1,8, nacht 4 2,2, nacht 5 2,6, daarna 3 keer zo snel.
- **Vanaf nacht 3 door de steen in de grond** (`DEEP_NIGHT`, `isGround`, `canDig`): alle slopers en gravers graven dan ook door steen, graniet, dioriet, andesiet en ertsen. Niet door wat Jippe zelf bouwt (keien, bakstenen, planken voor de kleine dieren); ijzer en obsidiaan houden altijd alles tegen. Aan het begin van nacht 3 zegt het spel: "Pas op: nu graven ze ook door steen! Bouw met keien of ijzer."
- Naar beneden door aarde gaat in één keer; een muur of gang van aarde eerst met scheurtjes; steen in 2 tot 4 keer.
- Gemeten (schacht van 9 diep: aarde en dan steen, bovenop dicht): varken nacht 1 en 2 komt er niet bij, nacht 3 in 18 s, nacht 5 in 13 s; een konijn past door een smalle schacht en is er nog sneller.
- Tests: `FASE=6c npm run test:browser` (nacht 1 veilig in de steen, nacht 4 niet, een dak van keien houdt het varken tegen) en de unit-tests.

## 17. Controle van de code (versie 6.6.1)

Gedaan: strenge ESLint-regels (geen fouten), TypeScript-controle op de JavaScript (alleen ruis van three.js en eigenschappen die pas tijdens het spelen worden gezet), en een lange proef (3 nachten, 12 grote dieren, een huis met een bunker; geen fouten, geen NaN-posities, geen lekken). Gevonden en gerepareerd:

- **De rode ogen zaten niet aan de kop.** Sinds 6.4.0 draait en knikt de kop (kijken naar Jippe, rondkijken), maar de ogen zaten aan het hele dier vast en bleven dus staan. Nu zitten ze aan de kop. Ver weg, als het dier één stuk is en de losse kop niet getekend wordt, staat er een tweede setje ogen op de plek van de kop (`eyesFar`).
- **Per ongeluk stoppen.** Tikken op het menu (of het dierenboek) midden in de Wilde Nacht stopte de ronde meteen. Nu staat het spel stil en vraagt een bord "Stoppen?" met twee grote knoppen: Doorgaan en Stoppen. Het boek is tijdens de Wilde Nacht niet te zien (het opent via het menu).
