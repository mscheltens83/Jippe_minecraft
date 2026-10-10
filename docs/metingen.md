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
