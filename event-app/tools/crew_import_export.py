"""Explicit, read-only operator export. Private artifacts are never activation."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess
import sys

from crew_import_verify import verify_import
from crew_transfer_reconcile import validate_target_export

ROOT = Path(__file__).resolve().parents[2]
MAX_EXPORT_BYTES = 512 * 1024 * 1024
ERROR = "CREW_PRIVATE_EXPORT_FAILED"
_UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
_NAME = re.compile(r"[A-Za-z0-9_.-]{1,63}")
_SERVICE = re.compile(r"[A-Za-z0-9_-]{1,80}")
_HASH = re.compile(r"[0-9a-f]{64}")
_KEYS = {"version", "mode", "phase", "editionId", "requestId", "requestActorId",
         "databaseName", "databaseUser", "actorId", "transactionReadOnly", "isolationLevel",
         "target", "receipt", "storedSourceText", "planText", "authorityVerified", "applyReady", "cutoverReady"}


def _require(condition):
    if not condition:
        raise ValueError(ERROR)


def _uuid(value):
    return type(value) is str and _UUID.fullmatch(value) is not None and value != "00000000-0000-0000-0000-000000000000"


def _arguments(edition_id, database, database_user, request_id, request_actor_id):
    _require(_uuid(edition_id))
    for name in (database, database_user):
        _require(type(name) is str and _NAME.fullmatch(name) is not None)
    _require((request_id is None) == (request_actor_id is None))
    if request_id is not None:
        _require(_uuid(request_id) and _uuid(request_actor_id))


def build_export_sql(edition_id, database, database_user, request_id=None, request_actor_id=None):
    """Return fixed read-only SQL; all interpolated values have narrow syntax."""
    try:
        _arguments(edition_id, database, database_user, request_id, request_actor_id)
        request = "NULL::uuid" if request_id is None else "'%s'::uuid" % request_id
        actor = "NULL::uuid" if request_actor_id is None else "'%s'::uuid" % request_actor_id
        phase = "before" if request_id is None else "after"
        return """BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='5s';
WITH context AS MATERIALIZED (
 SELECT current_database() AS db,current_user AS db_user,auth.uid() AS actor
 WHERE current_database()='%s' AND current_user='%s'
), snapshot AS MATERIALIZED (
 SELECT public.crew_import_target_preview('%s'::uuid) AS data FROM context
), request AS MATERIALIZED (
 SELECT r.response,a.plan_text,p.source_text
 FROM public.crew_import_requests r
 JOIN public.crew_import_approvals a ON a.id=r.approval_id AND a.edition_id=r.edition_id AND a.actor_id=r.actor_id
 JOIN public.crew_transfer_packages p ON p.id=(r.response->>'packageId')::uuid AND p.edition_id=r.edition_id AND p.actor_id=r.actor_id
 WHERE r.edition_id='%s'::uuid AND r.request_id=%s AND r.actor_id=%s
), document AS (
 SELECT jsonb_build_object(
 'version',1,'mode','crew_private_export','phase','%s','editionId','%s',
 'authorityVerified',false,'applyReady',false,'cutoverReady',false,
 'requestId',%s,'requestActorId',%s,'databaseName',c.db,'databaseUser',c.db_user,'actorId',c.actor,
 'transactionReadOnly',current_setting('transaction_read_only')='on',
 'isolationLevel',current_setting('transaction_isolation'),
 'target',s.data || jsonb_build_object(
  'sourcePackages',coalesce((SELECT jsonb_agg(to_jsonb(p)-'source_text' ORDER BY p.id)
   FROM public.crew_transfer_packages p WHERE p.edition_id='%s'::uuid),'[]'::jsonb),
  'sourceLinks',coalesce((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.package_id,l.source_row_id)
   FROM public.crew_transfer_links l WHERE l.edition_id='%s'::uuid),'[]'::jsonb)),
 'receipt',(SELECT response FROM request),'planText',(SELECT plan_text FROM request),
 'storedSourceText',(SELECT source_text FROM request)) AS data FROM context c CROSS JOIN snapshot s
)
SELECT data::text AS export_document FROM document WHERE octet_length(data::text)<=%d;
COMMIT;
""" % (database, database_user, edition_id, edition_id, request, actor, phase, edition_id,
       request, actor, edition_id, edition_id, MAX_EXPORT_BYTES)
    except (ValueError, TypeError):
        raise ValueError(ERROR) from None


def _object(pairs):
    result = {}
    for key, value in pairs:
        _require(key not in result)
        result[key] = value
    return result


def _bad_number(_value):
    raise ValueError(ERROR)


def validate_export(raw, edition_id, database, database_user, request_id=None, request_actor_id=None):
    """Validate the collected envelope, preserving server fingerprint and bytes."""
    try:
        _arguments(edition_id, database, database_user, request_id, request_actor_id)
        _require(type(raw) is bytes and len(raw) <= MAX_EXPORT_BYTES + 1)
        document = json.loads(raw.decode("utf-8"), object_pairs_hook=_object, parse_constant=_bad_number)
        # Reject escaped lone surrogates and overflows in unknown metadata too.
        json.dumps(document, ensure_ascii=False, allow_nan=False).encode("utf-8")
        _require(type(document) is dict and document.keys() == _KEYS)
        _require(type(document["version"]) is int and document["version"] == 1)
        expected = {"mode": "crew_private_export", "phase": "before" if request_id is None else "after",
                    "editionId": edition_id, "requestId": request_id, "requestActorId": request_actor_id,
                    "databaseName": database, "databaseUser": database_user,
                    "isolationLevel": "repeatable read", "transactionReadOnly": True,
                    "authorityVerified": False, "applyReady": False, "cutoverReady": False}
        for key, value in expected.items():
            _require(type(document[key]) is type(value) and document[key] == value)
        _require(_uuid(document["actorId"]))
        target = document["target"]
        normalized = validate_target_export(target)
        _require(normalized["editionId"] == edition_id and normalized["provenanceReady"])
        fingerprint = target.get("targetFingerprint")
        _require(type(fingerprint) is str and _HASH.fullmatch(fingerprint) is not None)
        for category in target["categories"]:
            _require("required_count" in category and "required_term" in category)
            count, term = category["required_count"], category["required_term"]
            _require(count is None or type(count) is int and 0 <= count <= 10000)
            _require(type(term) is str and len(term) <= 1000)
        for link in target["sourceLinks"]:
            _require("source_history_id" in link)
            _require(link["source_history_id"] is None or type(link["source_history_id"]) is str)
        for package in target["sourcePackages"]:
            _require("source_text" not in package)
        if request_id is None:
            _require(all(document[key] is None for key in ("receipt", "storedSourceText", "planText")))
        else:
            source, plan, receipt = document["storedSourceText"], document["planText"], document["receipt"]
            _require(type(source) is str and type(plan) is str and type(receipt) is dict)
            _require(receipt.get("requestId") == request_id)
            result = verify_import(source.encode("utf-8"), plan, after=target,
                                   receipt=receipt, stored_source_text=source)
            expected_blockers = [
                "BEFORE_EXPORT_REQUIRED", "LIVE_AUTHORITY_REVIEW_REQUIRED",
                "MANUAL_CUTOVER_APPROVAL_REQUIRED", "VERIFIED_BACKUP_AND_RESTORE_REQUIRED",
            ]
            if normalized["archived"]:
                expected_blockers.append("TARGET_ARCHIVED")
            _require(not result["findings"] and result["blockers"] == sorted(expected_blockers))
            package = next((p for p in target["sourcePackages"] if p["id"] == receipt["packageId"]), None)
            _require(package is not None and package["source_sha256"] == result["sourceSha256"]
                     and package.get("actor_id") == request_actor_id)
        return document
    except (ValueError, TypeError, KeyError, StopIteration, OverflowError, RecursionError):
        raise ValueError(ERROR) from None


def _identity(value):
    return value.st_dev, value.st_ino


def _private(value, directory=False):
    _require(value.st_uid == os.getuid())
    _require(stat.S_ISDIR(value.st_mode) if directory else stat.S_ISREG(value.st_mode))
    _require(stat.S_IMODE(value.st_mode) == (0o700 if directory else 0o600))
    if not directory:
        _require(value.st_nlink == 1)


def _parent(path, create=False):
    path = Path(path)
    _require(path.is_absolute() and ".." not in path.parts)
    relative = path.relative_to(ROOT)
    _require(len(relative.parts) >= 2 and relative.parts[0] == ".local")
    fd = os.open(ROOT, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in relative.parts:
            if create:
                try:
                    os.mkdir(part, 0o700, dir_fd=fd)
                except FileExistsError:
                    pass
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = child
            _require(os.fstat(fd).st_uid == os.getuid())
        _private(os.fstat(fd), directory=True)
        return fd
    except BaseException:
        os.close(fd)
        raise


def _config(path):
    path = Path(path)
    _require(path.is_absolute())
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        _private(info)
        _require(0 < info.st_size <= 1024 * 1024)
        return fd
    except BaseException:
        os.close(fd)
        raise


def collect_export(*, edition_id, database, database_user, service, service_file,
                   pass_file, psql, output_parent, request_id=None, request_actor_id=None):
    """Run only the fixed read query and publish one validated private artifact.

    Failed jobs may retain private partial files for manual inspection. Existing
    artifacts are never overwritten or deleted, including after publication I/O errors.
    """
    descriptors = []
    process = None
    try:
        sql = build_export_sql(edition_id, database, database_user, request_id, request_actor_id)
        _require(type(service) is str and _SERVICE.fullmatch(service) is not None)
        executable = Path(psql)
        _require(executable.is_absolute())
        executable = executable.resolve(strict=True)
        _require(executable.is_file() and os.access(executable, os.X_OK))
        service_fd = _config(service_file)
        descriptors.append(service_fd)
        pass_fd = _config(pass_file)
        descriptors.append(pass_fd)
        parent_fd = _parent(output_parent, create=True)
        descriptors.append(parent_fd)
        name = "crew-export-" + secrets.token_hex(16)
        os.mkdir(name, 0o700, dir_fd=parent_fd)
        job_fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent_fd)
        descriptors.append(job_fd)
        _private(os.fstat(job_fd), directory=True)
        data_fd = os.open("export.partial", os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=job_fd)
        descriptors.append(data_fd)
        data_identity = _identity(os.fstat(data_fd))
        env = {key: os.environ[key] for key in ("PATH", "LANG", "LC_ALL") if key in os.environ}
        env.update(PGSERVICEFILE="/dev/fd/%d" % service_fd, PGPASSFILE="/dev/fd/%d" % pass_fd,
                   PGSYSCONFDIR=str(Path(output_parent) / name), PGCLIENTENCODING="UTF8",
                   PGAPPNAME="svdt-crew-private-export", PGCONNECT_TIMEOUT="15")
        process = subprocess.Popen(
            [str(executable), "-X", "-q", "-A", "-t", "--no-password", "-v", "ON_ERROR_STOP=1",
             "--dbname", "service=" + service],
            stdin=subprocess.PIPE, stdout=data_fd, stderr=subprocess.DEVNULL, env=env,
            pass_fds=(service_fd, pass_fd), shell=False,
        )
        process.communicate(sql.encode("utf-8"), timeout=60)
        _require(process.returncode == 0)
        info = os.fstat(data_fd)
        _private(info)
        _require(0 < info.st_size <= MAX_EXPORT_BYTES + 1)
        stamp = info.st_size, info.st_mtime_ns, info.st_ctime_ns
        os.lseek(data_fd, 0, os.SEEK_SET)
        with os.fdopen(os.dup(data_fd), "rb") as source:
            raw = source.read(MAX_EXPORT_BYTES + 2)
        validate_export(raw, edition_id, database, database_user, request_id, request_actor_id)

        def bound():
            check_fd = _parent(output_parent)
            try:
                _require(_identity(os.fstat(check_fd)) == _identity(os.fstat(parent_fd)))
            finally:
                os.close(check_fd)
            _private(os.fstat(job_fd), directory=True)
            job = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
            _require(stat.S_ISDIR(job.st_mode) and _identity(job) == _identity(os.fstat(job_fd)))
            entry = os.stat("export.partial", dir_fd=job_fd, follow_symlinks=False)
            _require(stat.S_ISREG(entry.st_mode) and _identity(entry) == data_identity)

        bound()
        _private(os.fstat(data_fd))
        latest = os.fstat(data_fd)
        _require((latest.st_size, latest.st_mtime_ns, latest.st_ctime_ns) == stamp)
        os.fsync(data_fd)
        os.link("export.partial", "export.json", src_dir_fd=job_fd, dst_dir_fd=job_fd, follow_symlinks=False)
        os.fsync(job_fd)
        bound()
        _require(_identity(os.stat("export.json", dir_fd=job_fd, follow_symlinks=False)) == data_identity)
        os.unlink("export.partial", dir_fd=job_fd)
        _private(os.fstat(data_fd))
        os.fsync(job_fd)
        os.fsync(parent_fd)
        return {"status": "CREW_PRIVATE_EXPORT_SAVED", "path": str(Path(output_parent) / name / "export.json"),
                "sha256": hashlib.sha256(raw).hexdigest(), "authorityVerified": False, "applyReady": False}
    except Exception:
        raise ValueError(ERROR) from None
    finally:
        cleanup_failed = False
        if process is not None:
            try:
                if process.poll() is None:
                    process.kill()
                    process.wait()
            except OSError:
                cleanup_failed = True
            try:
                if process.stdin is not None:
                    process.stdin.close()
            except OSError:
                cleanup_failed = True
        for descriptor in reversed(descriptors):
            try:
                os.close(descriptor)
            except OSError:
                cleanup_failed = True
        if cleanup_failed:
            raise ValueError(ERROR) from None


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError(ERROR)


def main(argv=None):
    parser = _Parser(description="Explicit private read-only crew export; no import or activation.", allow_abbrev=False)
    parser.add_argument("--collect", action="store_true")
    for flag in ("edition-id", "database", "database-user", "service", "service-file", "pass-file", "psql"):
        parser.add_argument("--" + flag, required=True)
    parser.add_argument("--output-parent", default=str(ROOT / ".local/crew-import-exports"))
    parser.add_argument("--request-id")
    parser.add_argument("--request-actor-id")
    try:
        args = vars(parser.parse_args(argv))
        _require(args.pop("collect"))
        print(json.dumps(collect_export(**args)))
        return 0
    except (Exception, KeyboardInterrupt):
        print(ERROR, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
