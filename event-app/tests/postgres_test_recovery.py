"""Opt-in recovery of a single disposable synthetic test server, never production."""
import json
import os
from pathlib import Path
import re
import stat
import tempfile
import uuid


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def private_regular(path):
    info = path.lstat()
    require(stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid() and info.st_mode & 0o077 == 0,
            'Recovery requires owned private regular files')


def read_checkpoint(path, image):
    path = Path(path).absolute()
    require(path.name == 'checkpoint.json' and path.parent.name.startswith('postgres-synthetic-'),
            'Recovery requires a synthetic test checkpoint')
    folder = path.parent
    info = folder.lstat()
    require(stat.S_ISDIR(info.st_mode) and info.st_uid == os.getuid() and info.st_mode & 0o077 == 0,
            'Recovery requires an owned private directory')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        info = os.fstat(fd)
        require(stat.S_ISREG(info.st_mode) and info.st_uid == os.getuid()
                and info.st_mode & 0o077 == 0 and 0 < info.st_size <= 16384,
                'Invalid recovery checkpoint file')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            raw = stream.read(16385)
    finally:
        os.close(fd)

    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, 'Duplicate checkpoint key')
            result[key] = value
        return result

    try:
        data = json.loads(raw, object_pairs_hook=unique,
                          parse_constant=lambda value: (_ for _ in ()).throw(ValueError()))
    except (ValueError, UnicodeError, RecursionError):
        raise RuntimeError('Invalid recovery checkpoint JSON') from None
    require(isinstance(data, dict) and set(data) == {
        'version', 'phase', 'token', 'name', 'containerId', 'anonymousVolumes', 'image'}, 'Invalid checkpoint shape')
    require(type(data['version']) is int and data['version'] == 1 and data['image'] == image, 'Wrong checkpoint version/image')
    require(isinstance(data['token'], str) and re.fullmatch('[0-9a-f]{32}', data['token'])
            and data['name'] == 'svdt-synthetic-' + data['token'], 'Invalid checkpoint ownership marker')
    require(data['phase'] in ('created', 'ready', 'cleaning', 'cleaned'), 'Incomplete checkpoint needs manual review')
    require(isinstance(data['containerId'], str) and re.fullmatch('[0-9a-f]{64}', data['containerId']), 'Invalid container ID')
    volumes = data['anonymousVolumes']
    require(isinstance(volumes, list) and 0 < len(volumes) <= 4
            and all(isinstance(v, str) and re.fullmatch('[0-9a-f]{64}', v) for v in volumes)
            and len(set(volumes)) == len(volumes), 'Invalid anonymous volume IDs')
    return folder.resolve(), data, raw


def validate_live_identity(data, folder, metadata):
    require(isinstance(metadata, list) and len(metadata) == 5, 'Invalid live ownership evidence')
    identity, name, image, token, mounts = metadata
    require(identity == data['containerId'] and name == '/' + data['name']
            and image == data['image'] and token == data['token'], 'Refuse recovery of a foreign container')
    require(isinstance(mounts, list) and len(mounts) == 2 and all(isinstance(m, dict) for m in mounts), 'Unexpected container mounts')
    volumes = [m for m in mounts if m.get('Type') == 'volume']
    binds = [m for m in mounts if m.get('Type') == 'bind']
    require(len(volumes) == 1 and len(binds) == 1, 'Unexpected container storage')
    require([m.get('Name') for m in volumes] == data['anonymousVolumes']
            and volumes[0].get('Destination') == '/var/lib/postgresql', 'Foreign volume reference')
    require(binds[0].get('Source') == str(folder / 'password')
            and binds[0].get('Destination') == '/run/secrets/dbpass'
            and binds[0].get('RW') is False, 'Foreign bind mount')


def recover_checkpoint(args, path, server_type, image, confirmed_absence):
    folder, data, original = read_checkpoint(path, image)
    root = Path(args.output_root).resolve()
    require(root.is_dir() and root.stat().st_uid == os.getuid() and root.stat().st_mode & 0o077 == 0
            and folder.is_relative_to(root), 'Checkpoint outside the explicit private output root')
    require(Path(args.docker_socket).is_socket(), 'A local Unix Docker socket is required')
    for name in ('password', 'pgpass', 'services'):
        file = folder / name
        if file.exists() or file.is_symlink():
            private_regular(file)
    server = object.__new__(server_type)
    server.args = args
    server.folder = folder
    server.docker_config = Path(tempfile.mkdtemp(prefix='recovery-client-', dir=folder))
    server.token, server.name = data['token'], data['name']
    server.container, server.volumes = data['containerId'], data['anonymousVolumes']
    server.children = []
    server.password = None
    server.password_file, server.pass_file, server.service_file = [folder / n for n in ('password', 'pgpass', 'services')]
    selection = '{{json .Id}}\n{{json .Name}}\n{{json .Config.Image}}\n{{json (index .Config.Labels "svdt.acceptance.run")}}\n{{json .Mounts}}'
    inspection = server.docker('inspect', '--format', selection, server.container, check=False)
    absent = confirmed_absence(inspection, 'object')
    if not absent:
        require(inspection.returncode == 0, 'Docker inspection failed; cleanup not authorized')
        try:
            metadata = [json.loads(line) for line in inspection.stdout.splitlines()]
        except ValueError:
            raise RuntimeError('Invalid live inspection') from None
        validate_live_identity(data, folder, metadata)
    else:
        # Never delete a volume just because its name occurs in a checkpoint.
        for name in server.volumes:
            require(confirmed_absence(server.docker('volume', 'inspect', '--format', '{{.Name}}', name, check=False), 'volume'),
                    'Orphan or unverifiable volume needs manual review; it will not be deleted')
    require(read_checkpoint(path, image)[2] == original, 'Checkpoint changed during verification')
    if absent:
        for file in (server.password_file, server.pass_file, server.service_file):
            file.unlink(missing_ok=True)
        server.checkpoint('cleaned')
    else:
        require(server.cleanup(), 'Owned recovery cleanup failed')
    report = {'version': 1, 'mode': 'owned_synthetic_test_recovery', 'successful': True,
              'testSuiteSuccessful': False, 'alreadyAbsent': absent, 'containerRemoved': True,
              'anonymousVolumesRemoved': True, 'disposableCredentialsRemoved': True,
              'cutoverReady': False, 'liveImportRun': False}
    server.private_write(folder / ('recovery-' + uuid.uuid4().hex + '.json'), json.dumps(report, indent=2) + '\n')
    return report
