# Soukromé čtecí rozhraní původu a historie crew

Rozsah2026-11-12: připravené DB rozhraní, nikoli aktivované schéma nebo hotové UI. Nová additive migrace202611120001 nemění původních6 migrací, neimportuje data a nevytváří osoby/účty/členství. Výslovný zákaz skutečného importu dál platí.

`crew_transfer_history_index(editionId,rosterId)` vrací seznam zdrojových balíčků připojených ke konkrétnímu rosteru. Obsahuje pouze metadata původu, ověřeného autora záznamu, čas, sourcehash a ID pracovní/historické řádky; nevydává source_text ani obsah jiných lidí. Nad1000 zdrojů chybuje, nikdy potichu nezkracuje.

`crew_transfer_history_row(editionId,rosterId,packageId)` vyžaduje explicitní výběr balíčku a vrací původní pracovní řádek2027 a jeho navázaný historický řádek2026, případně historyRow:null, pokud vazba není. Původní content zůstává původním stringem, včetně neznámých sloupců/NULL/nuly. Není to aktuální stav2027 ani potvrzení účasti/částek. Nevyhledává související lidi podle jména/kontaktu a nenahrazuje historii2025 domnělým spojením.

Obě RPC jsou STABLE, SECURITY DEFINER s prázdným search_path. Vynucují přihlášeného správce konkrétního ročníku2027 a přesnou vazbu roster/balíček/ročník. Koordinátor včetně finančního grantu, běžný člen, viewer, cizí správce a anon nemají přístup. Archiv2027 je pro tento čtecí účel dostupný správci. Role se ověřuje při každém volání. Funkce nic nezapisují ani nepřidávají audit čtení; bezpečnostní či retenční politika auditu přístupů zůstává samostatný budoucí rozsah. Přímé privátní parsery zůstávají klientům zakázané.

Pro budoucí UI: nejdřív metadata konkrétního řádku, potom explicitní zdroj. Vykreslovat jako escapovaný text, nikdy HTML nebo instrukce. Neukládat do dema/public/localStorage/logů ani nehromadit obsah všech balíčků do běžného seznamu. Celý source_text se tímto RPC neposílá; operátorský byte-for-byte readback pro kontrolní protokol39 je samostatný privátní krok.

Ověření i meze se zapisují do crew-history-verification.json. Živé RLS/účty, browser/UI, víceklientový PostgreSQL, potvrzený projekt a aktivace zůstávají na později v31. Toto rozhraní neprokazuje nezměnitelnost proti infrastrukturnímu správci, autoritu dodaných exportů nebo vzdálenou obnovu.
