# SVDT 2027 — BACKLOG

## A. Podklady, které má Vojta dodat
- [ ] Loňský / aktuální Excel rozpočet.
- [ ] Databáze personálu z minulých ročníků.
- [ ] Databáze jezdců z minulých ročníků.
- [ ] Seznam / tabulka partnerů a historie spolupráce.
- [ ] Tabulky celoročních brigád, pokud existují.
- [ ] Historické mapy trati, zón, evakuačních přístupů a produkce.
- [ ] Seznam dodavatelů / kontaktů, pokud existuje.
- [ ] Loňské harmonogramy.
- [ ] Existující formuláře pro partnery/dodavatele.
- [ ] Relevantní dokumenty k registraci/prezenci riderů.
- [ ] Feedback IZS/záchranky z minulého ročníku.
- [ ] Jakékoliv existující checklisty stavby/deinstalace.

## B. Organizace — otevřené role
- [ ] Potvrdit Mirka (?) jako Race Coordinatora.
- [ ] Najít zálohu Race Coordinatora.
- [ ] Jindra (?) jako Vlasta +1 — ověřit.
- [ ] Vojta +1 — obsadit.
- [ ] Zástup IZS Coordinatora.
- [ ] Zástup Track Managera.
- [ ] Zástup manažera traťových komisařů.
- [ ] Waste / Cleaning Manager.
- [ ] Production / Logistics Lead pro Vlastu.
- [ ] Owner předání kompletně postaveného areálu do provozu.
- [ ] Owner kontroly naložení skladu/dodávek.

## C. Race / safety protokoly
- [ ] Timekeeping Emergency Protocol s dodavatelem.
- [ ] Ověřit rerun / timing pravidla se svazem nebo hlavním rozhodčím.
- [ ] Rozhodnout a otestovat záložní kamery start + cíl.
- [ ] Jednostránkový Radio Protocol.
- [ ] Ranní radio-check workflow.
- [ ] Aktualizovat evakuační plán podle reality.
- [ ] Před aktualizací sebrat feedback záchranky + IZS.
- [ ] Weather / Crisis Protocol.
- [ ] Definovat konkrétní weather thresholds později.
- [ ] Lost Child Protocol formalizovat.
- [ ] Krátký postup chybějící crew / rider před startem.
- [ ] Formalizovat Open Track / Go-No-Go checklist.
- [ ] Formalizovat restart po incidentu.
- [ ] Incident logging standard: co přesně se hlásí rádiem a co zapisuje Race Control.
- [ ] Backup při výpadku elektřiny.
- [ ] Backup při výpadku internetu.
- [ ] Backup při úplném výpadku rádia.

## D. Race Control
- [ ] Potvrdit Točírnu jako fyzické místo.
- [ ] Ověřit napájení, internet a radio coverage.
- [ ] Seznam vybavení Race Control.
- [ ] Přístupová pravidla.
- [ ] Role Race Control Assistant — rozhodnout, zda 2027 ano/ne.
- [ ] Nastavit krátké pravidelné check-iny Vojta ↔ Race Coordinator.

## E. Crew / provoz
- [ ] Rozhodnout finální organizační zařazení Crew Base (Vojta vs. Vlasta).
- [ ] Jídlo traťových komisařů: distribuce na stanoviště vs. několik výdejních bodů.
- [ ] Riziko únavy komisařů a možnosti střídání.
- [ ] Rider uplift / vývoz na start — rozhodnout podle času/rozpočtu.
- [ ] Parkování riderů — člověk pod Race Coordinator.
- [ ] VIP parking — pod VIP manager.
- [ ] Zásobování v den akce — pod Vlastu / +1, lokálně zónoví manažeři.
- [ ] Rozmístění komisařů a dalších prvků kontrolovat i podle broadcast kamer.

## F. Aplikace — architektura před kódováním
- [ ] Dopracovat post-event fázi.
- [ ] Finální datový model / ER diagram.
- [ ] Permissions matrix.
- [ ] Rozhodnout multi-event scope (SVDT + možnost budoucího Pikniku).
- [ ] Offline strategy.
- [ ] Audit log strategy.
- [ ] Notification strategy.
- [ ] File/document storage strategy.
- [ ] Import/export strategy.
- [ ] Integrace a API boundaries.
- [ ] Map proof-of-concept — vysoká priorita.

## G. Mapový modul
- [ ] Srovnat mapové technologie a udělat prototyp.
- [ ] Otestovat výkon na mobilu/desktopu s desítkami vrstev.
- [ ] Fullscreen + search + filters.
- [ ] Logické skupiny vrstev.
- [ ] Offline cache.
- [ ] Tisk/export PDF s výběrem vrstev.
- [ ] Scan/foto papírové mapy → AI návrh změn → ruční potvrzení.
- [ ] Live state a plán v jedné mapě bez matoucí duplicity.
- [ ] Live Crew Tracking — pravidla, souhlasy, retence a oprávnění.

## H. AI 2027 experiment
- [ ] AI gateway / rozpočtové limity.
- [ ] AI nesmí být kritická závislost.
- [ ] Hlasový vstup pro Vojtu / Race Control.
- [ ] AI strukturování incident logu.
- [ ] AI změny mapy pouze jako návrh + potvrzení.
- [ ] Weather assistant.
- [ ] Readiness / „co hoří“ briefing.
- [ ] Otestovat v pátek / sobotu ráno před závodem.
- [ ] Po akci vyhodnotit, co má smysl standardizovat pro 2028.

## I. Partners — první modul
- [ ] Interní seznam partnerů.
- [ ] Pole: owner, stav (osloven/potvrzen/zamítnut), poznámka, datum dalšího kroku.
- [ ] Centrální profil organizace.
- [ ] Ročníkové partnerství.
- [ ] Partner fulfillment: nesplněno / v řešení / splněno.
- [ ] Partner Portal.
- [ ] Partner questionnaire.
- [ ] VIP QR.
- [ ] Partner documents / invoices visible externally pouze jejich vlastní.
- [ ] Post-event partner report.
- [ ] Feedback.

## J. Finance — druhý modul
- [ ] Po dodání Excelu navrhnout datový model.
- [ ] Plan vs Actual.
- [ ] Income / Expense.
- [ ] Faktury + přílohy.
- [ ] Payment status.
- [ ] Vazby na partnera/dodavatele/person.
- [ ] Později Fio API.
- [ ] Automatické párování + fronta nejasných transakcí.
- [ ] Bezpečné uložení tokenu mimo GitHub.

## K. Další budoucí moduly
- [ ] Personnel database + Crew Portal.
- [ ] Riders + Registration + Rider Portal.
- [ ] Suppliers + Supplier Form.
- [ ] Zones.
- [ ] Tasks.
- [ ] Master Schedule + role views.
- [ ] Year-round Brigády.
- [ ] Build Plan.
- [ ] Media Plan + Media Portal.
- [ ] Branding map layer.
- [ ] Public/Spectator app.
- [ ] Weather.
- [ ] Accreditation / wristbands.
- [ ] Accommodation flag.
- [ ] Parking / vehicle access.
- [ ] Lessons Learned / Knowledge Base.
- [ ] Feedback.
- [ ] Post-event closeout.

## Nejbližší další krok
1. Dopracovat **post-event** fázi.
2. Udělat finální architektonický snapshot / ER model.
3. Začít stavět **Partners**.
4. Následně **Finance**.
