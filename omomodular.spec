# PyInstaller spec for a Windows onedir build of OmoModular.
# Build with: pyinstaller omomodular.spec
#
# console=True on purpose for this first release: if something goes wrong on
# a machine we've never tested on, the visible console is the only debug
# output a user can hand back to us. Safe to flip to False once this has
# been confirmed working across a few real Windows machines.

a = Analysis(
    ['pyinstaller_entry.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('omomodular/web', 'omomodular/web'),
        ('omomodular/midi', 'omomodular/midi'),
        ('omomodular/samples', 'omomodular/samples'),
    ],
    hiddenimports=[
        # uvicorn resolves these dynamically at runtime, which PyInstaller's
        # static import analysis can't see on its own.
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'websockets',
        'websockets.legacy',
        'websockets.legacy.server',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='omomodular',
    debug=False,
    strip=False,
    upx=False,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name='omomodular',
)
