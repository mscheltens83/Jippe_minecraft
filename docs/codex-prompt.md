# Prompt voor OpenAI Codex: fase 3 bouwen

Met deze prompt laat je Codex één fase uit [`fase-3-plan.md`](fase-3-plan.md) bouwen. Doe het **fase voor fase** (A, B, C, D, E, F, G) en test na elke fase even op de iPad.

## Zo gebruik je hem
1. Open **Codex** in de ChatGPT-app of op chatgpt.com. De cloudversie werkt ook zonder computer.
2. Koppel de repository **mscheltens83/Jippe_minecraft** en kies de branch **`claude/compassionate-dirac-pkrfgp`**.
3. Plak de prompt hieronder en vervang `<LETTER>` door de fase (begin met `A`).
4. Codex maakt een pull request. Voeg die samen op GitHub (**Merge pull request**). Na een paar minuten staat de nieuwe versie op `https://mscheltens83.github.io/Jippe_minecraft/`.
5. Probeer het op de iPad. Werkt alles, dan de volgende fase.

## De prompt

````
Je werkt aan JippeCraft: een Minecraft-achtig bouwspel voor een kind van 6 jaar.
Repository: mscheltens83/Jippe_minecraft, branch `claude/compassionate-dirac-pkrfgp`.
Techniek: gewone JavaScript-modules met Three.js (in lib/), GEEN bouwstap. De site staat
via GitHub Pages online vanaf deze branch.

OPDRACHT: bouw FASE <LETTER> uit docs/fase-3-plan.md. Alleen deze fase.

Lees eerst:
1. docs/fase-3-plan.md helemaal: vooral §1 (uitgangspunten), §2 (kaart van de code),
   §13 (wat deze fase inhoudt) en de hoofdstukken die daarbij horen.
2. README.md en PLAN.md.
3. De bestanden die volgens §2 bij deze fase veranderen.

Werkwijze:
- Maak een nieuwe branch `codex/fase-3-<letter>` vanaf `claude/compassionate-dirac-pkrfgp`.
- Kleine, duidelijke commits. Commentaar in het Nederlands, in de stijl van de bestaande code.
- Houd je aan §1: geen geweld of bloed (opeten = tekenfilm-"poef"), alles te begrijpen
  zonder lezen, gemaakt voor de iPad (touch, snel genoeg), geen bouwstap, oude bewaarde
  werelden blijven werken.
- Voeg de tests uit §12 die bij deze fase horen toe aan tests/smoke.mjs.
- Voer `npm install` en `npm test` uit. Ontbreekt de browser, voer dan eerst
  `npx playwright install chromium` uit. ALLES moet slagen, ook de bestaande controles.
  De test-browser is traag: wacht met waitForFunction en ruime tijden, niet met vaste pauzes.
- Werk bij: sw.js (nieuwe bestanden in FILES en CACHE één versie hoger), README.md
  (tabel "Hoe speel je?"), PLAN.md (status fase 3), en vink de fase af in §13 van
  docs/fase-3-plan.md.
- Open een pull request naar `claude/compassionate-dirac-pkrfgp` met, in eenvoudige woorden:
  wat er gebouwd is, welke tests erbij kwamen, de uitkomst van `npm test`, en wat je niet
  kon testen (bijvoorbeeld op een echte iPad).
- Twijfel je over een ontwerpkeuze, volg dan de standaard in §14. Is iets onduidelijk of
  niet mogelijk, schrijf dat dan in de pull request in plaats van te gokken.

Niet doen:
- Geen andere branches aanpassen, geen force-push, geen instellingen van de repository wijzigen.
- Geen nieuwe externe bibliotheken of bouwtools toevoegen.
- Geen meerdere fases tegelijk.
````

## Na elke fase
- Spel openen op de iPad en proberen wat erbij is gekomen (zie de pull request).
- Iets niet goed? Plak het antwoord van Codex of een screenshot in een nieuwe opdracht: "Fase <LETTER>: dit werkt nog niet goed: …".
