"""Local, durable crew workspace. Real data stays under ignored .local/.

No cloud connection. History is immutable; 2027 is a separate working copy.
"""
from __future__ import annotations
import argparse
import copy
import datetime as dt
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import tempfile
import threading
import unicodedata
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'event-app-zadani/wireframes'
COLORS = [f'cat-{i}' for i in range(12)]
STATES = {'candidate': 'Neoslovený', 'contacted': 'Poptaný', 'confirmed': 'Potvrzený', 'declined': 'Odmítl', 'unknown': 'K ověření'}
LABELS = ['jméno', 'poptán?', 'poznámka - stav', 'pozice', 'kdo ho řeší - před / na akci', 'kontakt', 'Kč nástřel', 'Kč', 'Bartr', 'Celková hodnota', 'Vyplaceno', 'poznámka']
TEXT_LIMITS = {'name': 200, 'categoryId': 100, 'position': 500, 'owner': 500, 'email': 500, 'phone': 500, 'contactOriginal': 2000, 'statusNote': 4000, 'notes': 10000, 'barter': 4000, 'merch': 2000, 'term': 1000, 'friday': 100, 'saturday': 100}
OPTIONAL_TEXT_LIMITS = {'friday', 'saturday'}
MONEY_KEYS = ('estimate', 'agreed', 'total', 'paid')

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)

class Problem(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message

def amount_minor(value):
    if value is None or value == '':
        return None
    if not isinstance(value, str):
        raise Problem(422, 'Částku zadej jako text v Kč.')
    normalized = re.sub(r'[\s\u00a0\u202f]', '', value).replace(',', '.')
    if not re.fullmatch(r'\d{1,9}(?:\.\d{1,2})?', normalized):
        raise Problem(422, 'Částka musí být nezáporná, nejvýše 999 999 999,99 Kč, se dvěma desetinnými místy.')
    whole, _, decimal = normalized.partition('.')
    return int(whole) * 100 + int(decimal.ljust(2, '0') or '0')

def money_display(value):
    if value is None:
        return None
    whole, fraction = divmod(value, 100)
    return f'{whole},{fraction:02d} Kč'

def read_seed(path):
    text = Path(path).read_text()
    if text.startswith('window.SVDT_CREW_SHEET='):
        text = text.split('=', 1)[1].strip().removesuffix(';')
    payload = json.loads(text)
    if not isinstance(payload.get('records'), list):
        raise ValueError('Missing source records')
    return payload

REQUIRED_SNAPSHOT_TABLES = {'meta', 'history', 'categories', 'working', 'audit', 'requests'}
REQUIRED_SNAPSHOT_COLUMNS = {
    'meta': {'key', 'value'},
    'history': {'id', 'year', 'content'},
    'categories': {'id', 'name', 'name_key', 'color', 'sort_order', 'version'},
    'working': {'id', 'year', 'category_id', 'content', 'source_id', 'version', 'updated_at'},
    'audit': {'id', 'at', 'kind', 'record_id', 'before_json', 'after_json'},
    'requests': {'id', 'fingerprint', 'response'},
}
SNAPSHOT_ERROR_MESSAGE = 'Nepodařilo se bezpečně vytvořit záložní kopii.'

class SnapshotError(Exception):
    pass

def verify_snapshot(path):
    # Read only: callers decide whether to delete or overwrite; this never does either.
    connection = sqlite3.connect(Path(path).absolute().as_uri() + '?mode=ro&immutable=1', uri=True)
    try:
        if connection.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise SnapshotError('Snapshot failed integrity check')
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not REQUIRED_SNAPSHOT_TABLES.issubset(tables):
            raise SnapshotError('Snapshot is missing required schema')
        for table, columns in REQUIRED_SNAPSHOT_COLUMNS.items():
            present = {row[1] for row in connection.execute(f'PRAGMA table_info({table})')}
            if not columns.issubset(present):
                raise SnapshotError('Snapshot is missing required columns')
        row = connection.execute("SELECT value FROM meta WHERE key='initialized'").fetchone()
        if not row or not isinstance(row[0], str) or not row[0].strip():
            raise SnapshotError('Snapshot is missing initialization metadata')
    finally:
        connection.close()

def existing_snapshot_is_valid(target):
    # Symlinks are never trusted regardless of what they resolve to, and we never
    # follow or touch them; any non-regular-file or failed verification is just "invalid".
    if target.is_symlink() or not target.is_file():
        return False
    try:
        verify_snapshot(target)
    except Exception:
        return False
    return True

def atomic_sqlite_snapshot(source_db, target):
    # Published only via os.link, which atomically fails instead of silently replacing a path
    # that already exists (a prior valid backup, a corrupted leftover, or a symlink).
    target = Path(target)
    if os.path.lexists(target):
        if existing_snapshot_is_valid(target):
            return False
        raise SnapshotError(SNAPSHOT_ERROR_MESSAGE)
    tmp_path = None
    try:
        fd, tmp_name = tempfile.mkstemp(dir=target.parent, prefix='.crew-snapshot-', suffix='.tmp')
        tmp_path = Path(tmp_name)
        os.close(fd)
        snapshot = sqlite3.connect(tmp_path)
        try:
            source_db.backup(snapshot)
        finally:
            snapshot.close()
        verify_snapshot(tmp_path)
        try:
            os.link(tmp_path, target)
            return True
        except FileExistsError:
            # Another process won the race; evaluate what it left the same way as any
            # pre-existing target instead of assuming it is a valid completed snapshot.
            if existing_snapshot_is_valid(target):
                return False
            raise SnapshotError(SNAPSHOT_ERROR_MESSAGE)
    except SnapshotError:
        raise
    except Exception as error:
        raise SnapshotError(SNAPSHOT_ERROR_MESSAGE) from error
    finally:
        if tmp_path is not None:
            try:
                tmp_path.unlink(missing_ok=True)
            except OSError as error:
                raise SnapshotError(SNAPSHOT_ERROR_MESSAGE) from error

class CrewStore:
    def __init__(self, directory, seed):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.directory.chmod(0o700)
        self.path = self.directory / 'crew.sqlite3'
        self.lock = threading.RLock()
        self.db = sqlite3.connect(self.path, check_same_thread=False, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA synchronous=FULL')
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.executescript('''
          CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS history(id TEXT PRIMARY KEY,year TEXT NOT NULL CHECK(year IN ('2025','2026')),content TEXT NOT NULL);
          CREATE TRIGGER IF NOT EXISTS immutable_history_update BEFORE UPDATE ON history BEGIN SELECT RAISE(ABORT,'History is read only'); END;
          CREATE TRIGGER IF NOT EXISTS immutable_history_delete BEFORE DELETE ON history BEGIN SELECT RAISE(ABORT,'History is read only'); END;
          CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE,color TEXT NOT NULL,sort_order INTEGER NOT NULL,version INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS working(id TEXT PRIMARY KEY,year TEXT NOT NULL DEFAULT '2027' CHECK(year='2027'),category_id TEXT NOT NULL REFERENCES categories(id),content TEXT NOT NULL,source_id TEXT REFERENCES history(id),version INTEGER NOT NULL,updated_at TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at TEXT NOT NULL,kind TEXT NOT NULL,record_id TEXT NOT NULL,before_json TEXT,after_json TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,response TEXT NOT NULL);
        ''')
        self.path.chmod(0o600)
        if not self.db.execute("SELECT 1 FROM meta WHERE key='initialized'").fetchone():
            self._seed(seed() if callable(seed) else seed)
        self.backup()

    def _seed(self, seed):
        records = [copy.deepcopy(r) for r in seed['records'] if r.get('year') in ('2025','2026')]
        if not records:
            raise ValueError('Historical seed is required for first initialization')
        names = ['Registrace', 'VIP']
        for r in records:
            name = r.get('category') or 'K zařazení'
            if name == 'Bez kategorie ve zdroji':
                name = 'K zařazení'
            if name not in names:
                names.append(name)
        if 'K zařazení' in names:
            names.remove('K zařazení')
            names.append('K zařazení')
        categories = {}
        self.db.execute('BEGIN IMMEDIATE')
        try:
            for i, name in enumerate(names):
                identifier = str(uuid.uuid4())
                self.db.execute('INSERT INTO categories VALUES(?,?,?,?,?,1)', (identifier, name, name.casefold(), COLORS[i % len(COLORS)], i))
                categories[name] = identifier
            for r in records:
                self.db.execute('INSERT INTO history VALUES(?,?,?)', (r['id'], r['year'], encoded(r)))
                if r['year'] != '2026':
                    continue
                cat = r.get('category') or 'K zařazení'
                if cat == 'Bez kategorie ve zdroji':
                    cat = 'K zařazení'
                if re.search(r'\bvip\b', str(r.get('position','')), re.I):
                    cat = 'VIP'
                fields = {key: '' for key in TEXT_LIMITS}
                fields.update(name=r.get('name',''), categoryId=categories[cat], position=r.get('position',''), owner=r.get('owner',''), email=r.get('email',''), phone=r.get('phone',''), contactOriginal=str(r.get('raw',[{}]*6)[5].get('value') or '') if not (r.get('email') or r.get('phone')) else '', status='candidate', archived=False, money={key: None for key in MONEY_KEYS})
                identifier = 'w27-' + r['id']
                self.db.execute('INSERT INTO working VALUES(?,?,?,?,?,?,?)', (identifier,'2027',categories[cat],encoded(fields),r['id'],1,now()))
            self.db.execute('INSERT INTO meta VALUES(?,?)', ('source_hash', str(seed.get('sourceSha256',''))))
            self.db.execute('INSERT INTO meta VALUES(?,?)', ('initialized', now()))
            self.db.execute('COMMIT')
        except Exception:
            self.db.execute('ROLLBACK')
            raise

    def backup(self):
        # One recoverable snapshot per Prague day of use, plus the transaction audit.
        with self.lock:
            folder = self.directory / 'backups'
            folder.mkdir(exist_ok=True)
            folder.chmod(0o700)
            target = folder / f'crew-{dt.datetime.now(ZoneInfo("Europe/Prague")).date()}.sqlite3'
            atomic_sqlite_snapshot(self.db, target)

    def categories(self):
        return [dict(r) for r in self.db.execute('SELECT id,name,color,sort_order AS sortOrder,version FROM categories ORDER BY sort_order,name')]

    def record(self, row):
        f = json.loads(row['content'])
        f.setdefault('friday', '')
        f.setdefault('saturday', '')
        category = self.db.execute('SELECT name FROM categories WHERE id=?', (row['category_id'],)).fetchone()['name']
        money = f['money']
        values = [f['name'], 'Ne' if f['status']=='candidate' else 'Ano' if f['status'] in ('contacted','confirmed','declined') else None, f['statusNote'], f['position'], f['owner'], ' · '.join(v for v in (f['email'],f['phone'],f['contactOriginal']) if v), money_display(money['estimate']), money_display(money['agreed']), f['barter'], money_display(money['total']), money_display(money['paid']), f['notes']]
        return {'id':row['id'],'year':'2027','dataset':'working-2027','name':f['name'],'category':category,'categoryId':row['category_id'],'categoryBasis':'Pracovní zařazení 2027','position':f['position'],'owner':f['owner'],'email':f['email'],'phone':f['phone'],'status':f['status'],'statusLabel':STATES[f['status']],'statusBasis':'Pracovní údaj pro rok 2027','cash':money_display(money['agreed']),'barter':f['barter'],'merch':f['merch'],'raw':[{'label':label,'value':value} for label,value in zip(LABELS,values)],'extra':[{'label':'Termín / účast','value':f['term']},{'label':'PÁ (od–do)','value':f['friday']},{'label':'SO (od–do)','value':f['saturday']}],'source':{'sheet':'Pracovní verze 2027','row':'—'},'sourceId':row['source_id'],'sourceYear':'2026' if row['source_id'] else None,'version':row['version'],'updatedAt':row['updated_at'],'fields':f,'archived':f['archived']}

    def payload(self):
        with self.lock:
            history = [json.loads(row['content']) for row in self.db.execute('SELECT content FROM history ORDER BY year DESC,rowid')]
            current = [self.record(row) for row in self.db.execute('SELECT * FROM working ORDER BY rowid')]
            return {'private':True,'workspace':True,'defaultYear':'2027','categories':self.categories(),'records':current+history,'datasets':[{'id':'working-2027','year':'2027','label':'Pracovní verze 2027'},{'id':'personnel-2026','year':'2026','label':'Historie 2026'},{'id':'personnel-2025','year':'2025','label':'Historie 2025'}]}

    def validate(self, fields, previous=None):
        allowed_keys = set(TEXT_LIMITS) | {'status','archived','amounts'}
        required_keys = allowed_keys - OPTIONAL_TEXT_LIMITS
        if not isinstance(fields, dict) or not required_keys.issubset(fields) or not set(fields).issubset(allowed_keys):
            raise Problem(422, 'Formulář obsahuje neplatná pole. Obnov stránku a zkus to znovu.')
        result = {}
        for key, limit in TEXT_LIMITS.items():
            v = fields[key] if key in fields else (previous or {}).get(key, '')
            if not isinstance(v,str) or len(v)>limit or '\x00' in v:
                raise Problem(422, 'Některý údaj je příliš dlouhý nebo neplatný.')
            result[key] = v.strip()
        if not result['name']:
            raise Problem(422, 'Vyplň jméno nebo název skupiny.')
        if not self.db.execute('SELECT 1 FROM categories WHERE id=?',(result['categoryId'],)).fetchone():
            raise Problem(422, 'Vyber existující kategorii.')
        if not isinstance(fields['status'],str) or fields['status'] not in STATES or not isinstance(fields['archived'],bool):
            raise Problem(422, 'Neplatný stav záznamu.')
        if fields['status']=='confirmed' and not result['term']:
            raise Problem(422, 'U potvrzené účasti doplň, pro jaký termín platí.')
        if not isinstance(fields['amounts'],dict) or set(fields['amounts'])!=set(MONEY_KEYS):
            raise Problem(422, 'Neplatné částky.')
        result.update(status=fields['status'],archived=fields['archived'],money={k:amount_minor(fields['amounts'][k]) for k in MONEY_KEYS})
        return result

    def mutate(self, request_id, fingerprint_value, action):
        if not isinstance(request_id,str) or not re.fullmatch(r'[A-Za-z0-9-]{16,100}', request_id):
            raise Problem(422, 'Chybí identifikátor uložení. Zkus uložit znovu.')
        fingerprint = hashlib.sha256(encoded(fingerprint_value).encode()).hexdigest()
        with self.lock:
            self.backup()
            self.db.execute('BEGIN IMMEDIATE')
            try:
                prior = self.db.execute('SELECT * FROM requests WHERE id=?',(request_id,)).fetchone()
                if prior:
                    if prior['fingerprint'] != fingerprint:
                        raise Problem(409,'Stejný požadavek obsahuje jiné údaje. Obnov uloženou verzi.')
                    response = json.loads(prior['response'])
                else:
                    response = action()
                    self.db.execute('INSERT INTO requests VALUES(?,?,?)',(request_id,fingerprint,encoded(response)))
                self.db.execute('COMMIT')
                return response
            except Exception:
                self.db.execute('ROLLBACK')
                raise

    def save_record(self, identifier, body):
        if not re.fullmatch(r'[A-Za-z0-9-]{1,100}',identifier):
            raise Problem(422,'Neplatný záznam.')
        if not isinstance(body,dict) or set(body)!={'requestId','version','year','fields'} or body['year']!='2027':
            raise Problem(403,'Historii lze pouze číst. Upravovat můžeš rok 2027.')
        if type(body['version']) is not int or body['version']<0:
            raise Problem(422,'Neplatná verze záznamu.')
        def action():
            if self.db.execute('SELECT 1 FROM history WHERE id=?',(identifier,)).fetchone():
                raise Problem(403,'Historii nelze přepsat.')
            prior = self.db.execute('SELECT * FROM working WHERE id=?',(identifier,)).fetchone()
            if (prior['version'] if prior else 0)!=body['version']:
                raise Problem(409,'Řádek mezitím někdo změnil. Rozepsané údaje zůstaly; načti aktuální verzi.')
            previous = json.loads(prior['content']) if prior else None
            fields = self.validate(body['fields'], previous)
            version = (prior['version'] if prior else 0)+1
            if prior:
                self.db.execute('UPDATE working SET category_id=?,content=?,version=?,updated_at=? WHERE id=?',(fields['categoryId'],encoded(fields),version,now(),identifier))
            else:
                self.db.execute('INSERT INTO working VALUES(?,?,?,?,?,?,?)',(identifier,'2027',fields['categoryId'],encoded(fields),None,version,now()))
            self.db.execute('INSERT INTO audit(at,kind,record_id,before_json,after_json) VALUES(?,?,?,?,?)',(now(),'record',identifier,prior['content'] if prior else None,encoded(fields)))
            return {'record':self.record(self.db.execute('SELECT * FROM working WHERE id=?',(identifier,)).fetchone())}
        return self.mutate(body['requestId'],{'kind':'record','id':identifier,'body':body},action)

    def save_category(self, identifier, body):
        if not isinstance(body,dict) or set(body)!={'requestId','version','name','color'} or type(body['version']) is not int:
            raise Problem(422,'Neplatná kategorie.')
        name = body['name'].strip() if isinstance(body['name'],str) else ''
        if not name or len(name)>100 or body['color'] not in COLORS:
            raise Problem(422,'Vyplň název kategorie a vyber barvu.')
        def action():
            prior = self.db.execute('SELECT * FROM categories WHERE id=?',(identifier,)).fetchone()
            if (prior['version'] if prior else 0)!=body['version']:
                raise Problem(409,'Kategorii mezitím někdo změnil. Načti aktuální údaje.')
            duplicate = self.db.execute('SELECT 1 FROM categories WHERE name_key=? AND id<>?',(name.casefold(),identifier)).fetchone()
            if duplicate:
                raise Problem(422,'Kategorie se stejným názvem už existuje.')
            if prior:
                self.db.execute('UPDATE categories SET name=?,name_key=?,color=?,version=version+1 WHERE id=?',(name,name.casefold(),body['color'],identifier))
            else:
                order = self.db.execute('SELECT COALESCE(MAX(sort_order),0)+1 FROM categories').fetchone()[0]
                self.db.execute('INSERT INTO categories VALUES(?,?,?,?,?,1)',(identifier,name,name.casefold(),body['color'],order))
            category = next(c for c in self.categories() if c['id']==identifier)
            self.db.execute('INSERT INTO audit(at,kind,record_id,before_json,after_json) VALUES(?,?,?,?,?)',(now(),'category',identifier,encoded(dict(prior)) if prior else None,encoded(category)))
            return {'category':category}
        return self.mutate(body['requestId'],{'kind':'category','id':identifier,'body':body},action)

    def export(self):
        with self.lock:
            return {'format':'svdt-local-crew-v1','exportedAt':now(),'payload':self.payload(),'audit':[dict(r) for r in self.db.execute('SELECT * FROM audit ORDER BY id')]}

class CrewHTTPServer(ThreadingHTTPServer):
    def __init__(self, address, store):
        super().__init__(address, CrewHandler)
        self.store, self.csrf = store, secrets.token_urlsafe(32)
        port = self.server_address[1]
        self.allowed_hosts = {f'127.0.0.1:{port}',f'localhost:{port}'}
        self.allowed_origins = {'http://'+host for host in self.allowed_hosts}

class CrewHandler(BaseHTTPRequestHandler):
    server: CrewHTTPServer
    def log_message(self, *_):
        pass  # No individual data or request URLs in logs.

    def reply(self, status, data, mime='application/json; charset=utf-8', extra=None):
        raw = encoded(data).encode() if mime.startswith('application/json') else data
        self.send_response(status)
        self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(raw)))
        for key,value in {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-src 'self'; frame-ancestors 'self'"}.items():
            self.send_header(key,value)
        for key,value in (extra or {}).items():
            self.send_header(key,value)
        self.end_headers()
        self.wfile.write(raw)

    def host_ok(self):
        return self.headers.get('Host') in self.server.allowed_hosts

    def do_GET(self):
        try:
            if not self.host_ok():
                raise Problem(403,'Nepovolený místní přístup.')
            origin=self.headers.get('Origin')
            if origin and origin not in self.server.allowed_origins:
                raise Problem(403,'Nepovolený původ požadavku.')
            path=urlsplit(self.path).path
            if path=='/api/bootstrap':
                return self.reply(200,{'token':self.server.csrf,'payload':self.server.store.payload()})
            if path=='/api/export':
                return self.reply(200,self.server.store.export(),extra={'Content-Disposition':'attachment; filename="svdt-crew-local.json"'})
            if path in ('/','/crew.html'):
                html=(WEB/'crew.html').read_text().replace("connect-src 'none'","connect-src 'self'").replace('<script defer src="crew-sheet-fixtures.js"></script><script defer src="crew-sheet.js"></script>','<script defer src="crew-workspace.js"></script>')
                html=html.replace('</head>','<link rel="stylesheet" href="crew-workspace.css"></head>')
                return self.reply(200,html.encode(),'text/html; charset=utf-8')
            allowed={'/crew-csv.js','/styles.css','/crew-sheet.css','/crew-sheet.js','/crew-workspace.js','/crew-workspace.css','/assets/exo-500.ttf','/assets/exo-700.ttf','/assets/exo-900.ttf','/index.html','/prototype.js','/fixtures.js','/fixtures.json','/crew-operations.html','/crew.js','/crew.css','/crew-review.html','/crew-review.js','/crew-review.css'}
            allowed.add('/crew-category-colors.css')
            if path not in allowed:
                raise Problem(404,'Soubor nebyl nalezen.')
            file=WEB/path.lstrip('/')
            mime={'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.json':'application/octet-stream','.ttf':'font/ttf'}[file.suffix]
            return self.reply(200,file.read_bytes(),mime)
        except Problem as error:
            self.reply(error.status,{'error':error.message})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            self.reply(500,{'error':'Místní údaje se nepodařilo načíst. Zkus to znovu.'})

    def do_PUT(self):
        try:
            if not self.host_ok() or self.headers.get('Origin') not in self.server.allowed_origins or not hmac.compare_digest(self.headers.get('X-SVDT-CSRF',''),self.server.csrf):
                raise Problem(403,'Uložení není povolené z této stránky. Obnov místní pracovní verzi.')
            if self.headers.get('Content-Type','').split(';')[0]!='application/json':
                raise Problem(415,'Neplatný formát požadavku.')
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=65536:
                raise Problem(413,'Požadavek je příliš velký.')
            body=json.loads(self.rfile.read(size))
            match=re.fullmatch(r'/api/(records|categories)/([A-Za-z0-9-]{1,100})',urlsplit(self.path).path)
            if not match:
                raise Problem(404,'Záznam nebyl nalezen.')
            result=(self.server.store.save_record if match[1]=='records' else self.server.store.save_category)(match[2],body)
            self.reply(200,result)
        except Problem as error:
            self.reply(error.status,{'error':error.message})
        except (ValueError, json.JSONDecodeError):
            self.reply(400,{'error':'Neplatné údaje požadavku.'})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            self.reply(500,{'error':'Uložení se nepodařilo potvrdit. Rozepsané údaje ponech a zkus uložit znovu.'})

    def do_OPTIONS(self):
        self.reply(403,{'error':'Přístup z jiného webu není povolený.'})

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=4317)
    parser.add_argument('--data-dir',type=Path,default=ROOT/'.local/crew-workspace')
    parser.add_argument('--seed',type=Path,default=ROOT/'.local/crew-personnel-preview/crew-private-data.js')
    args=parser.parse_args()
    # Existing databases are never rebuilt from the historical seed.
    store=CrewStore(args.data_dir,lambda:read_seed(args.seed))
    server=CrewHTTPServer(('127.0.0.1',args.port),store)
    print(f'Pracovní personál: http://127.0.0.1:{args.port}/crew.html',flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        store.db.close()

if __name__=='__main__':
    main()
