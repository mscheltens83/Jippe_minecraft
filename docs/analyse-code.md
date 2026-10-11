# Code-analyse: foutencheck en optimalisatie (versie 5.4.1)

Na fase 5 is de hele code doorgelicht: automatisch (typecontrole, strenge lintregels, zoeken naar ongebruikte code), met metingen van waar de rekentijd heen gaat, en met de hand op de plekken waar het meeste mis kan gaan. Hieronder staat wat er gevonden is en wat er verbeterd is.

## 1. Hoe er gezocht is

| Controle | Hoe | Uitkomst |
|---|---|---|
| Typecontrole | TypeScript in controlemodus (`checkJs`) over alle 13.500 regels JavaScript | Geen echte fouten. De meldingen gingen over three.js zelf en over eigenschappen die pas later aan een object worden gegeven (zo werkt de code met opzet). |
| Strenge lintregels | 15 extra regels bovenop de gewone (`eqeqeq`, `no-shadow`, `no-use-before-define`, `prefer-const`, ...) | Vijf kleine dingen, geen echte fouten. De drie die de code duidelijker maken zijn aangepast. |
| Ongebruikte code | Script dat elke `export` zoekt die nergens anders gebruikt wordt | Negen dingen die nergens meer gebruikt worden, waaronder de oude wereldmaker van vóór de eindeloze wereld (60 regels). Weggehaald. |
| Meten | Profiel van 12 seconden vliegen door de Grote wereld in de testbrowser (hoofdthread) | Zie §2: drie plekken met veel onnodig werk. |
| Handmatig nalopen | Wereldplekken en extra werelden, portalen, rails, knoppen, karretje en bootje | Drie echte fouten, zie §3. |
| Foutenlogboek in de tests | De tests keken alleen naar fouten in de console, niet naar het eigen foutenlogboek van het spel | Nu controleert elke browsertest aan het eind ook het foutenlogboek (zie §4). |

## 2. Sneller

Gemeten tijdens 12 seconden vliegen (hoofdthread, testbrowser):

| | Voor | Na |
|---|---|---|
| Totale rekentijd van het spel | ±1500 ms | ±430–690 ms |
| Shaders vertalen tijdens het spelen | ±800 ms | 0 ms |
| Chunks kopiëren voor de workers | 152 ms | ±15 ms |
| Opruimen van geheugen (garbage collector) | 194 ms | ±140 ms |

Wat er veranderd is:

1. **De hand in beeld wordt vooraf voorbereid.** De shader van de hand (met het blok of plaatje dat je vasthoudt) werd pas vertaald als je op spelen tikte, omdat de hand bij het voorbereiden onzichtbaar was. Dat gaf een hapering bij de start. Nu worden een blokje en een plaatje in de hand gezet tijdens het voorbereiden (`hand.prewarm`).
2. **Geen wachten op de shadercontrole.** three.js vraagt na het vertalen van elke shader meteen of het gelukt is; de iPad moet dan wachten tot hij klaar is in plaats van verder te kunnen. Die controle staat nu alleen aan in de tests (`?vast`) of met `?debug`.
3. **De workers onthouden chunks.** Voor elke chunk die getekend wordt, stuurde het spel die chunk en zijn 8 buren naar een worker (9 × 64 kB = 576 kB kopiëren). Bij het vliegen zijn dat steeds grotendeels dezelfde chunks. Nu onthoudt elke worker de laatste 48 chunks, en stuurt de lader alleen wat de worker nog niet (of in een oudere versie) heeft. Elke chunk heeft daarvoor een uniek nummer (`uid`); de lader houdt precies bij wat elke worker heeft, en bij een nieuwe wereld of een fout begint de cache opnieuw.
4. **Het boek bevriest niet meer.** Bij het openen van het boek werden alle 48 dierstickers in één keer getekend. Nu gaat dat in stukjes van zes; stickers verschijnen zodra ze klaar zijn.

## 3. Gevonden fouten (en verbeterd)

1. **Een wereld kon onder de verkeerde naam bewaard worden.** Mislukte het laden van een andere wereldplek, dan bleef het spel denken dat je in een andere wereld (van de plek) was. Het volgende bewaren schreef de huidige wereld dan onder die verkeerde naam weg, en kon zo de hoofdwereld van een plek overschrijven met bijvoorbeeld de Jungle. Nu blijft alles zoals het was als het laden mislukt.
2. **Knoppen en drukplaten bleven aan na opnieuw laden.** Een knop is maar 2 seconden aan, maar die tijd wordt niet bewaard; na opnieuw laden bleef hij voor altijd aan (en de deur open). Ook een drukplaat kon blijven hangen. Nu kijkt het spel elke 2 seconden of er in de buurt een knop of drukplaat zonder reden aan staat, en zet die uit.
3. **Het karretje kwam op een helling niet meer in beweging.** Stapte je uit op een helling en weer in, dan zocht het spel de rails in het verkeerde vak en reed het karretje niet meer. Nu kijkt hij ook een vak lager.

Kleiner:
- Rails bleven zweven als je het blok eronder weghaalde; nu vallen ze weg, net als bloemen en fakkels.
- Opgeruimd: een `var` die `let` moest zijn, een tekst die vóór zijn definitie werd gebruikt, een rekensom met waar/onwaar.

## 4. Betere tests

- **Foutenlogboek.** Het spel vangt fouten op en schrijft ze in een eigen logboek (dat ouders op het ouderscherm zien). Fouten die zo opgevangen worden, kwamen niet in de console, en de tests zagen ze dus niet. Nu leest elke browsertest aan het eind het logboek; staat er iets in, dan faalt de test met de foutmelding.
- **Wankele tests op GitHub.** Een paar controles hingen af van timing op de (trage) testcomputer van GitHub: het "Nieuw!"-bordje dat maar 2,2 seconden in beeld staat, en een beeldvergelijking die ook chunks buiten de zichtafstand meetelde. Die zijn robuuster gemaakt. De tests lezen ook niet meer echt hardop voor (`?stil`).

## 5. Niet gedaan (en waarom)

- **Het samenvoegen van chunk-secties naar de worker verplaatsen** (`mergeSections`, ±45 ms per 12 s). Dan moet de hoofdthread de losse secties toch houden voor het opnieuw tekenen na bouwen; dat kost meer geheugen dan het oplevert.
- **De typecontrole vast in de tests.** Die geeft honderden meldingen over three.js en over eigenschappen die met opzet later worden gezet; zonder echte fouten weegt dat niet op tegen het onderhoud. Hij is één keer gedraaid voor deze analyse.
