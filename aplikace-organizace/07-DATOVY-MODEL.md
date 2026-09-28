# Datový model — principy

Globální entity: Event, Person, Organization, Rider, Document, Asset/Equipment.

Ročník/Edition (např. SVDT 2027) nese provozní data.

Klíčové vazby:
- Person → EditionPersonAssignment: role, zóna, směna, odměna, radio ID, docházka.
- Organization → EditionPartnership: owner, stav, částka, plnění.
- Rider → EditionRiderEntry: kategorie, číslo, platba, prezence, výsledek.
- Zone → lidé, dodavatelé, vybavení, úkoly, harmonogram, mapové prvky.
- Task → zóna/partner/dodavatel/dokument/build.
- FinanceEntry → partner/dodavatel/osoba/dokument.
- Document → univerzálně připojitelný objekt.
- BuildItem → zóna, termín, owner, crew, technika, dependencies, stav.
- Feedback → ročník + typ respondenta + témata.

Osoba/organizace se neduplikuje každý rok. Historie se zachovává přes ročníkové vazby.
