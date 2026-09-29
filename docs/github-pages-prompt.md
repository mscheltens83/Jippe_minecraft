# Prompt voor Codex: een website publiceren via GitHub Pages

JippeCraft staat al online op `https://mscheltens83.github.io/Jippe_minecraft/`. Elke nieuwe versie op de branch `claude/compassionate-dirac-pkrfgp` komt daar vanzelf op. Deze prompt is alleen nodig voor een **nieuw project**, of als Pages ooit uit komt te staan.

Werkt met Codex **op je Windows-computer**. De GitHub-opdrachtregeltool wordt aangeroepen via het volledige pad; dat was de oplossing die werkte.

````
Publiceer een website uit een GitHub-repository via GitHub Pages.

INVULLEN:
- REPO: mscheltens83/Jippe_minecraft
- BRANCH: claude/compassionate-dirac-pkrfgp
- OPENBAAR MAKEN TOEGESTAAN: ja

Ik werk op Windows: gebruik PowerShell (geen bash, geen grep, geen curl-opties van Linux).

Regels:
- Verander GEEN bestanden, maak geen commits, branches of pull requests.
- Pas alleen de zichtbaarheid en de Pages-instellingen van deze ene repository aan.
- Mislukt iets door rechten of inloggen: stop en meld de exacte foutmelding.

Stappen:
0. Gebruik de GitHub CLI via het volledige pad:
     $gh = "C:\Program Files\GitHub CLI\gh.exe"
   Bestaat dat bestand niet, installeer dan met:
     winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
   en gebruik daarna hetzelfde pad. Controleer:
     & $gh auth status
   Ben ik niet ingelogd, stop dan en vraag mij om uit te voeren:
     & "C:\Program Files\GitHub CLI\gh.exe" auth login

1. Controleer dat de branch een index.html in de root heeft:
     & $gh api "repos/<REPO>/contents/index.html?ref=<BRANCH>" --jq .name

2. Zichtbaarheid:
     & $gh repo view <REPO> --json visibility --jq .visibility
   Is die PRIVATE en is OPENBAAR MAKEN TOEGESTAAN "ja", maak hem dan openbaar:
     & $gh repo edit <REPO> --visibility public --accept-visibility-change-consequences
   Is het "nee", stop dan en meld dat GitHub Pages voor een privé-repository
   een betaald abonnement nodig heeft.

3. Pages instellen (vanaf de branch, map root):
     & $gh api repos/<REPO>/pages
   Geeft dat 404, zet Pages dan aan:
     & $gh api -X POST repos/<REPO>/pages -f build_type=legacy -f "source[branch]=<BRANCH>" -f "source[path]=/"
   Bestaat Pages al, zet de bron dan goed:
     & $gh api -X PUT repos/<REPO>/pages -f build_type=legacy -f "source[branch]=<BRANCH>" -f "source[path]=/"

4. Wacht op de bouw (maximaal 5 minuten):
     for ($i = 0; $i -lt 20; $i++) { $s = & $gh api repos/<REPO>/pages/builds/latest --jq .status; $s; if ($s -in 'built','errored') { break }; Start-Sleep 15 }
   Bij "errored": stop en toon de foutmelding. Gaat het om Jekyll, stel dan voor
   om een leeg bestand .nojekyll toe te voegen, maar doe dat niet zelf.

5. Controleer de website. Haal het adres op met:
     $url = & $gh api repos/<REPO>/pages --jq .html_url
   Controleer daarna (probeer het na een minuut opnieuw als het meteen mislukt):
     (Invoke-WebRequest $url -UseBasicParsing).StatusCode
     (Invoke-WebRequest $url -UseBasicParsing).Content -match '<title>'

6. Meld: het adres, de zichtbaarheid, de bouwstatus en de uitkomst van stap 5.
````
