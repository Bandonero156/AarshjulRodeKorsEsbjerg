# Privat årshjul på Cloudflare

Den eksisterende GitHub Pages-app i repoets rod er uændret. Cloudflare-buildet
genereres separat med `node cloudflare/build.mjs` og ligger i `cloudflare/dist`.
Upload kun denne mappe (eller ZIP af dens indhold), aldrig hele repoet.

## Sikkerhed

- Alle stier, også HTML, ikoner, manifest og CSV, kontrolleres af `_worker.js`.
- Cloudflare Access JWT kontrolleres med RS256-signatur, issuer, audience og udløb.
- Uden `ACCESS_TEAM_DOMAIN` og `ACCESS_AUD` svarer alle stier 403.
- Sæt **Fail closed** i både Production og Preview i Pages. Ellers kan Pages
  servere statiske filer uden Function, hvis gratisgrænsen opbruges.
- Opret Access-app for produktionsværten og alle preview/deployment-adresser.
  Ingen Everyone/Bypass-regel. Start med ejeren som eneste tilladte bruger.
- Private aktiviteter gemmes ikke i localStorage, Cache Storage eller HTTP-cache.
  Installerbar PWA er bevaret; offlineadgang til aktiviteter er bevidst slået fra.
- Push-endpoints, VAPID-nøgler og automatisk afsendelse er endnu ikke aktiveret.

## Data fra Google Sheet

Sheet: `1w7Gkeg_Tg2HkJo4Tu131PyrLl8fcEnnP6AduGakmbTs`, fanen `Aktiviteter`.

`SHEETS_MODE=published` er en udtrykkelig overgang til det nuværende publicerede
CSV-link. Browseren henter `/api/events.csv`; Google-kaldet sker på serveren.
**Det publicerede Google-link er stadig offentligt.** En proxy gør ikke Google
Sheet privat. Linket må ikke deaktiveres, mens GitHub Pages skal fungere som fallback.

Privat integration er forberedt som standard, når `SHEETS_MODE` ikke er `published`:

1. Brug en Google-servicekonto med Sheets API aktiveret og kun læseadgang til arket.
2. Gem `GOOGLE_SERVICE_ACCOUNT_EMAIL` og `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   som Cloudflare-hemmeligheder. Nøglen må aldrig ligge i GitHub eller klientfiler.
3. Sæt `SHEETS_MODE=private`, deploy igen, og test år/kategorier med rigtige data.
4. Deaktivér først offentlig Google-publicering efter en separat beslutning om
   fallback. Det vil bryde den nuværende offentlige GitHub Pages-datahentning.

## Konfiguration og deploy

Dashboardkonto og dedikeret D1-binding findes i `wrangler.toml`. Tilføj de faktiske
Access-værdier fra din egen Access-app. Teamdomæne skal have formen
`teamnavn.cloudflareaccess.com` uden `https://`.

Den 17. oktober 2026 er Access konfigureret på teamet
`curly-pond-079a.cloudflareaccess.com`, app-id
`f0624e8f-45c4-4643-9c7a-707935162947`. Appen dækker både
`aarshjul-rode-kors-esbjerg.pages.dev` og
`*.aarshjul-rode-kors-esbjerg.pages.dev`. Politikken `Årshjul - ejeradgang`
tillader kun kontoejerens e-mail; sessionen er 24 timer, og HTTP Only er aktivt.
Audience og teamdomæne er indsat i `wrangler.toml`; de er ikke hemmeligheder.
Eksisterende Cloudflare-ressourcer er ikke ændret.

Ved brug af Wrangler fra repoets rod:

```sh
node cloudflare/build.mjs
node --test cloudflare/worker.test.mjs
npx wrangler pages deploy cloudflare/dist --config cloudflare/wrangler.toml --project-name aarshjul-rode-kors-esbjerg --branch main
```

Dashboardets ændringer i bindings/variabler træder først i kraft ved næste deploy.
Wrangler-konfigurationen skal have de samme Access-værdier som dashboardet før
fremtidige CLI-deploys; ellers lukker appen igen med 403 (sikkert standardvalg).

Den nye D1-database har migration `migrations/0001_push.sql`: bruger-id fra Access,
push-abonnementer, præferencer (deaktiveret som standard) og deduplikering af
afsendelser. Der er ingen persondata eller abonnementer indsat.

Senere påmindelser bør ligge i en separat Worker med scheduled-handler og samme
D1-binding. Cron og push skal først aktiveres, når samtykke, VAPID, tidszoner,
fejlhåndtering og idempotent afsendelse er implementeret og testet.

## Krav før trafik flyttes

- Access-login virker for tilladt bruger, og anden bruger/inkognito afvises.
- Produktion og direkte deployment-/preview-adresser er beskyttede.
- Google-data vises gennem API, årsvælger og kategorier virker på mobil og desktop.
- Udløbet login/offline viser ikke gamle private data.
- Fail closed er aktivt i begge miljøer, og DB-binding er med i seneste deploy.
- Certifikat og HTTPS virker på den reelle brugerforbindelse.

Fallback: https://bandonero156.github.io/AarshjulRodeKorsEsbjerg/
Ingen DNS, redirects eller GitHub Pages-indstillinger ændres af dette arbejde.

Dokumentation:
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.google.com/identity/protocols/oauth2/service-account
