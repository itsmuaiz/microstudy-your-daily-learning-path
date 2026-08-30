# MicroStudy: Your Daily Learning Path

Bouw een webapp genaamd MicroStudy — een studie-app met leerpaden, in de stijl van Duolingo, maar met de visuele afwerking en interactiegevoel van Apple (vloeiend, direct, springs i.p.v. starre animaties).

Naam & branding

App heet overal MicroStudy — paginatitel, header, e-mailafzendernaam, onderwerpregels, meta-tags.

Authenticatie

Login/registratie met e-mail + wachtwoord. Geen "Doorgaan met Google"-knop.

Leerpad (kernfunctie)

Gebruiker uploadt studiestof en geeft aan hoeveel tijd hij heeft tot de toets/SO.

App genereert een leerpad: een reeks opeenvolgende stappen/lessen (Duolingo-stijl), verdeeld over de beschikbare dagen.

Elke dag/sessie ontgrendelt de volgende stap met nieuwe AI-gegenereerde vragen over de stof, tot de hele leerset is doorlopen.

Toon duidelijk hoeveel er per dag geleerd moet worden.

Leaderboard & groepen

Gebruikers maken groepen aan, nodigen anderen uit, en strijden op XP binnen de groep (gesorteerd leaderboard).

E-mailmeldingen

Mail bij dreigend streak-verlies of langere inactiviteit.

Na 2 weken inactiviteit: één laatste mail dat er geen mails meer volgen.

Platform

Volledig werkend als webapp, pc-compatibel.

Visueel & interactie-ontwerp (Apple-stijl)

Reactiesnelheid: feedback direct bij aanraken/klikken (niet pas bij loslaten), geen kunstmatige vertragingen.

Animaties: gebruik springs in plaats van vaste CSS-transitions voor alles wat de gebruiker aanraakt (voortgangsbalk op het pad, kaarten, sheets). Standaard "critically damped" (rustig, geen overshoot); alleen lichte bounce bij interacties met momentum (bijv. slepen/swipen).

Onderbreekbaarheid: animaties moeten op elk moment gepauzeerd/omgekeerd kunnen worden zonder te "springen".

Materiaal & diepte: gebruik subtiele translucentie/blur voor overlays (bijv. navigatiebalk) i.p.v. platte kleuren.

Typografie: systeemfont, strakke letter-/regelafstand bij grote koppen (streak-teller, XP), ruimere regelafstand bij body-tekst; hiërarchie via gewicht + grootte, niet alleen grootte.

Toegankelijkheid: respecteer prefers-reduced-motion (cross-fade i.p.v. spring/slide) en prefers-contrast.

Algemeen gevoel: simpel, direct en doelgericht — elk scherm laat duidelijk zien waar je bent, wat je kunt doen en hoe je verder komt. Duidelijke, specifieke labels (bijv. "Leerpad", "Groepen") in plaats van vage termen.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5b0b2e64-484a-4a5d-80c2-9f386ebe6339).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
