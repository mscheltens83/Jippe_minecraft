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
| 6B | Eng maken: ogen, gezichten, rode maan, mist, geluid, hartslag, schrikmomenten | 6.1.0 |
| 6C | Slopen: blokken met kracht en scheurtjes, beukers, rammers, instortende torens, vliegers, klimmers, BOE-knop | 6.2.0 |
| 6D | Steeds moeilijker: golven, de T-rex, beperkte bouwstenen als beloning, stickers | 6.3.0 |

## 7. Zo is 6A gebouwd (versie 6.0.0)

- **`storm.js`**: de klasse `Storm` regelt de ronde (fases `dag`, `nacht`, `ochtend`, `gepakt`, `overleefd`), de klok, de hartjes, het jagen en het raken, de knockback, valschade, de grens van 44 blokken, de balk bovenin en het eindbord. `nightPlan(n)` zegt per nacht hoe lang je mag bouwen, hoeveel en welke dieren komen en hoe snel ze zijn. `houseCheck()` kijkt vanaf de speler welke lege vakjes bereikbaar zijn (een open deur telt als gat); kom je ver weg, hoog boven of diep onder uit, dan is het huis open, en het vakje bij het gat glinstert.
- **Aparte wereld**: een nieuw eiland (willekeurige seed) dat nooit bewaard wordt (`saveNow` doet niets zolang `game.storm` bestaat). Daarvoor wordt de eigen wereld eerst bewaard; bij **Stoppen** (of het menu) laadt het spel die weer. Er verschijnen geen gewone dieren, en de roofdieren jagen niet op elkaar.
- **Dieren**: `Animal.chaseSpeed` laat ze rennen (sneller dan lopen, de leeuw sneller dan Jippe, het varken langzamer). Overdag staan ze stil en kijken naar je; 's nachts rennen ze op je af en proberen ze opzij als ze vastlopen. Een dier raakt je alleen als er geen blok tussen zit.
- **Uit tijdens de Wilde Nacht**: vliegen, stempels, dieren neerzetten, ei uitbroeden, voertuigen, aaien en voeren, dieren naar huis sturen, slapen, de huisknop en portalen.
- **Menu**: een knop **Wilde Nacht** (maan met rode ogen) naast Roofdieren jagen.
- Tests: `tests/unit/wildenacht.test.mjs` (huis dicht of open, deuren, steeds moeilijker) en `FASE=6a npm run test:browser`.
