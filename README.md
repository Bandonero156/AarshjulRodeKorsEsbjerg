# Årshjul for Røde Kors Samaritter Esbjerg

Google Sheets er administrationsfladen. Fanen Aktiviteter samler de seks aktivitetsfaner og indeholder År, Måned, Dato, Aktivitet, Kategori, Hvor, Beskrivelse, Ansvarlig og Vis. Arket har også Kategorier, Ideer og Medlemmer. Cloudflare-integrationen skal kun læse Aktiviteter.

Webappen i repoets rod driver den gamle GitHub Pages-side. Koden indeholder klikbare måneder, kategorifiltre, sted og en årsvælger baseret på synlige aktiviteter. PWA-filerne omfatter ikoner, manifest og service worker.

## Lokal kontrol

```sh
node --test cloudflare/worker.test.mjs
node cloudflare/build.mjs
```

Cloudflare-buildet ligger i cloudflare/dist. Se [driftsvejledningen](cloudflare/README.md) og [udviklingsplanen](ROADMAP.md) før deployment.

## Driftsstatus 25. november 2026

Cloudflare Access krævede login på produktionsværtens forside, API, manifest og service worker ved kontrol uden session. Dashboardets opsætning, preview-værter og data efter login kræver yderligere verifikation. GitHub Pages og det publicerede CSV-feed svarede fortsat uden login. Repoet er offentligt. Konfigurationen i Git bruger publiceret CSV som overgang og indeholder også kode til privat læsning via Google Sheets API. D1-skemaet er forberedt til push.
