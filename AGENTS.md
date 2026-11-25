# Arbejde med årshjulet

- Kommunikér på dansk. Læs README.md, ROADMAP.md og cloudflare/README.md før ændringer.
- Kontrollér aktuel kode, regneark og driftskonfiguration før migrering. Genbrug eksisterende Cloudflare-ressourcer og afklar eventuel betaling før oprettelse.
- Brug Google Sheets som administrationsflade og Europe/Copenhagen for datoer og planlagte opgaver. Kontrollér den aktuelle kolonnemapping, især Hvor og Vis.
- Beskyt både app og API med Cloudflare Access. Gem hemmeligheder i Cloudflare og hold aktivitets- og medlemsdata ude af Git og lokale browsercaches.
- Kør `node --test cloudflare/worker.test.mjs`, `node cloudflare/build.mjs` og `git diff --check` før ændringer afleveres. Test login, datakilde og relevante klienter før deployment godkendes.
- Bevar den senest fungerende private deployment til rollback. Luk gammel offentlig adgang efter verificeret privat drift og ejerens godkendelse.
