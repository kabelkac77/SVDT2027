# MASTER BACKLOG

## Organizace
- [ ] Potvrdit Mirka (?) jako Race Coordinatora + najít zálohu.
- [ ] Jindra (?) jako Vlasta +1; obsadit Vojta +1.
- [ ] Zástupy IZS Coordinator, Track Manager, Marshals Manager.
- [ ] Waste/Cleaning Manager.
- [ ] Production/Logistics Lead.
- [ ] Owner předání postaveného areálu.
- [ ] Owner kontroly naložení skladu/dodávek.
- [ ] Finální zařazení Crew Base.

## Race / safety
- [ ] Timekeeping Emergency Protocol s dodavatelem.
- [ ] Rerun/timing pravidla se svazem/rozhodčím.
- [ ] Záložní kamery start+cíl.
- [ ] Radio Protocol + radio-check.
- [ ] Aktualizace evakuačního plánu + feedback IZS.
- [ ] Weather/Crisis Protocol + thresholdy.
- [ ] Lost Child Protocol.
- [ ] Missing crew/rider postup.
- [ ] Go/No-Go checklist.
- [ ] Restart protocol.
- [ ] Incident reporting standard.
- [ ] Power/internet fallback.
- [ ] Rider uplift 2027.
- [ ] Jídlo/střídání/únava komisařů.
- [ ] Rozmístění komisařů i podle broadcast záběrů.

## Race Control
- [ ] Potvrdit Točírnu; ověřit power/internet/radio coverage.
- [ ] Equipment list + access rules.
- [ ] Race Control Assistant ano/ne.
- [ ] Check-in rytmus Vojta ↔ Race Coordinator.

## App architektura
- [ ] Finální ER diagram.
- [ ] Permissions matrix.
- [ ] Offline, audit log, notifications, file storage, import/export strategy.
- [ ] Prověřit Synology API.
- [ ] Map proof-of-concept.
- [ ] Multi-event scope do budoucna.

## Map
- [ ] Srovnat technologie + prototyp desítek vrstev.
- [ ] Mobile/desktop performance + offline cache.
- [ ] PDF print/export.
- [ ] Scan papírové mapy → AI návrh změn.
- [ ] Live Crew Tracking pravidla/souhlasy/retence.

## AI
- [ ] AI gateway + limity.
- [ ] Voice input, incident assistance, map proposals, weather, readiness briefing.
- [ ] Test před závodem + post-event evaluation.

## První implementace
### Partneři
- [ ] detailní schema, interní V1, Partner Portal, questionnaire, fulfillment, VIP QR, post-event report.
- [x] Detail interního modelu a UI/flow — `10-PARTNERI-MODEL-A-FLOW.md`.
- [x] Interní V1 + SQL migrace + oddělené demo + testy — `../event-app/`.
- [x] Filtrace dodaného Excelu a kontrola podkladů — `10-PARTNERI-IMPORT.md`.
- [x] Připojit Supabase a připravit admin přístup — uživatel potvrdil migraci, bootstrap a přihlášení.
- [ ] Dokončit live ověření Auth/PostgREST pro více rolí, hosting a automatické zálohy.
- [ ] Navazující externí portal/questionnaire/VIP QR/uploady/report. Souhrnná položka výše zůstává otevřená.
### Finance
- [x] Propojené lokální demo Partneři/Finance a model zkušebního flow — `11-FINANCE-MODEL-A-FLOW.md`. Sdílený backend zůstává otevřený.
- [ ] načíst Excel, schema plan/actual, faktury/přílohy/payment status, později Fio API.
- [x] Načíst všech šest listů dodaného rozpočtu, mapovat zdroje a převodní pravidla — `11-FINANCE-PODKLAD.md`.
- [ ] Detailní model a UI/flow: oddělený plán, potvrzená částka, částečné úhrady, osobní vyrovnání; kontrola překryvů hlavní akce/afterparty.
- [ ] Implementace, finanční oprávnění a ověřený import. Souhrnná položka zůstává otevřená.

## Další moduly

- [ ] **Odloženo na výslovný pokyn uživatele:** WhatsApp přihlášení / Twilio Verify. Klientský kód je připravený a vypnutý. Teď nekonfigurovat, neaktivovat ani nekupovat služby; vrátit se až na další pokyn. Podklady: `PRIHLASOVANI.md`.

- [ ] Denní obnovitelné zálohy aplikace, DB a příloh + CSV/XLSX, nezávislé úložiště, monitoring a ověřená obnova — `SPOLUPRACE-A-ZALOHY.md`.
- [x] Připravit předání Claude Code, společné instrukce a projektové skills — `HANDOFF-CLAUDE.md`.
- [x] Připravit ucelený Git commit aplikace, dokumentace a Claude handoffu; porovnat výchozí stav s GitHub `main` (2026-09-28).
- [ ] Další implementace předávat po malých změnách přes PR a review.

Personnel/Crew Portal; Riders/Registration; Suppliers; Zones; Tasks; Schedule; Brigády; Build Plan; Media Plan/Portal; Branding; Spectator app; Weather; Accreditation; Accommodation; Parking; Knowledge Base; Feedback; Post-event closeout.

Podrobně dodaný vs. zbývající rozsah: `IMPLEMENTATION-STATUS.md`.
