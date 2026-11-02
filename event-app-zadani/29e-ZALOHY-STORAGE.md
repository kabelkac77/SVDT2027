# Storage přílohy — omezený kolektor

BackupFile má vždy přesně pracovní tvar `{source:string,path:string,bytes:Buffer}` s cestou začínající `source/`, kompatibilní s backup-bundle.js. Do zdrojového textu nevkládat raw NUL/C0 bajty; regexové kontroly zapisovat textovými escape sekvencemi.

Implementovat jen `event-app/tools/backup-storage.js`, ESM bez závislostí kromě Node crypto. Export async `collectStorage({storage,inventory})` -> pole BackupFiles. `storage` je operátorem vytvořený serverový Supabase Storage client s oprávněním ke všem souborům; kolektor žádný klíč/net/config sám nekonstruuje. Žádné skutečné endpointy/data v modelu. Host používá synthetic fake SDK a samostatně HTTP protokol jen pokud potřeba.

## Autoritativní vstup a úplnost

inventory je `{complete:true,buckets:[{id:string,objects:[{key:string,id:string,updated_at:string,size:number,sha256?:string}]}]}` z ODDĚLENÉHO oprávněného inventáře (např. DB snapshot). Není dovoleno si jej odvodit ze stejného RLS omezeného seznamu nebo automaticky předstírat complete:true. Caller musí doložit úplnost oprávnění/rozsahu při aktivačním průchodu. Knihovna ověřuje shodu, ale nevydává operátorem zadaný inventář za důkaz reálného administrativního oprávnění. complete musí být literaltrue; chybějící/neplatný inventář => chyba, ani se nepokusit o download. Prázdný buckets[] je explicitně známě prázdný, nikoli nedostupná služba.

Ověřit typy/duplicity exactbucketid a exactobjectkey, id/updated_at neprázdné texty, size bezpečný integer>=0, optionalsha256 64lowerhex. Max9999objektů/celkem128MiB. Bucketid je bezpečný jediný segment; key relativní POSIX bez .,..,absolutní/backslash/control/loneUTF16/prázdných segmentů, max1000znaků, UTF8segment<=255. Neřešit nebezpečný key přejmenováním/normalizací: celá záloha se zastaví. Case/Unicode odlišné klíče lze zachovat protože fyzický export má číslované názvy, nikoli přímou extrakci key dofilesystemu.

## SDK smlouva dle instalované verze

`storage.listBuckets({limit:1000,offset:N,sortColumn:'id',sortOrder:'asc'}) -> {data:Bucket[],error}`; stránkovat do stránky<1000, odmítnout opakované/duplicitní id (max1000stránek). Podporované pouze type absent nebo 'STANDARD', žádné tiché vynechání analytics/vector/verzovaných archivů.
`storage.from(bucketId).listV2({prefix:'',limit:1000,with_delimiter:false,cursor?:string}) -> {data:{hasNext:boolean,nextCursor?:string,folders:[],objects:[{id,name,key?,updated_at,metadata:{size,...},version?,archived_at?,is_versioned?,is_delete_marker?}]},error}`. Při hasNext true vyžadovat neprázdný nový cursor, zakázat loop/prázdnou pokračující stránku/max1000stránek. folders musí být prázdné (požadujeme plochý úplný seznam), nic tiše nezahodit. key=object.key pokud je, jinakname. Odmítnout id null, typy metadata/size, duplicitní klíče, archivované/verzované/delete-marker záznamy; starší verze nejsou touto V1 pokryté. Každý SDK error/throw/malformeddata => konstantní chyba, nikdy úspěšné[]fallback.

Nejprve úplně vylistovat všechny buckety/objekty a porovnat přesně s inventory (sada bucketů/klíčů,id,updated_at,size). Teprve pak download. `storage.from(id).download(key) -> {data:Blob,error}`, pro každý soubor musíBlob.size odpovídat a výslednéBufferbytes.length taky, volitelnýsha256 musí souhlasit. Výpočet SHA256 všech bajtů. Žádné zprávy, upload nebo delete. Po všech downloadech znovu kompletně vylistovat a porovnat stejné identity/verze/velikosti s prvním inventářem. Změna během sběru => chyba, nic nevrátit jako úplnou zálohu. Úplná shoda metadat sama neprokazuje atomickou transakci mezi DB a Storage; job potřebuje potvrzené konzistentní okno29b.

## Výstup a chyby

Vrátit storage/objects/00000001.bin atd v deterministickém sortu exactbucketid+key a storage/inventory.json:version1, objects s původním bucket/key/id/updated_at/size/sha256 a exportPath, bucketmetadata pro obnovu public/mime/limit podle SDK. Pozor na UTF8/case zachovat původní klíče. Číslovanéexporty se nepřepisují. I0objektů má storage/inventory.json s explicitnímnulovýmpočtem. Žádnécontacts/keys/rawSDKerrors do logu, module nikdy console/stdout. Všechny chyby Error('BACKUP_STORAGE_FAILED'). Celkový limit počítat i pro manifest; nic tiše netruncovat. Bez filesystemu, CLI, scheduleru nebo dalších souborů. Completed questions=[], poznámky summary.

Reference: https://supabase.com/docs/reference/javascript/file-buckets-listv2 ; současné rozhraní instalovaného @supabase/storage-js (listBuckets options, SearchV2Object/SearchV2Result) zkontroloval host. Samostatné soubory nutné podle https://supabase.com/docs/guides/platform/backups . Testy nejsou živé oprávnění nebo vzdálená záloha.

Pole `version` samo o sobě není zakázané verzování bucketu: může být identita aktuálního objektu. Zachovat je do manifestu a kontrolovat shodu při druhém listu. Nepodporované jsou až explicitní is_versioned:true, archivované nebo delete-marker záznamy.
