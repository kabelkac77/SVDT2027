# Ověřovací úkol: platnost review před místní opravou

Veřejný čistý Python, standardní knihovna. Vytvořit `event-app/tools/review_receipt.py` a odpovídající syntetické unittesty `event-app/tests/review_receipt_test.py`.

API `validate_review(review, pull_request, expected_head, actor, repository)` vrátí `True` pro platné zadání opravy; při neplatném vstupu vyhodí `ValueError` s bezpečnou konstantní kategorií bez obsahu payloadu. Všechny argumenty jsou nedůvěryhodné. Nemutovat je. Žádné síťové ani souborové operace.

Platné expected_head je přesný 40znakový hex SHA malými písmeny. Pull request je otevřený, hlava i báze mají `repo.full_name` přesně rovné argumentu repository, `head.sha` přesně odpovídá očekávané revizi. Review má `user.login` rovné actor, stejné `commit_id` a skutečně vyplněné `submitted_at`. Doloženo musí být, že review je odeslané, ne rozepsané (`state` PENDING nepřijmout). Vstupní obálky a požadovaná pole mají správné typy a chybějící hodnoty nikdy neznamenají oprávnění. Testy musí ověřovat i zamítnutí nesprávného HEAD, jiného repozitáře či autora, zavřeného PR, rozepsaného review a poškozených vstupů. Pouze zcela fiktivní identifikátory a data.

Není zadána nová funkce aplikace ani změna produkce. Codex provede testy, nezávislé review a skutečný opravný cyklus ve stejném Draft PR. Modul je opakovatelný kontrolní nástroj pro hostitele; není důkaz živé autorizace sám o sobě.
