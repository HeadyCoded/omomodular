"""PyInstaller entry point.

PyInstaller analyzes whatever script it's pointed at as a standalone module,
not as a package member -- pointing it directly at omomodular/__main__.py
would break that file's relative imports (`from . import util`). This tiny
wrapper sits outside the package so `from omomodular.__main__ import main`
resolves omomodular as a real package instead.
"""
from omomodular.__main__ import main

if __name__ == "__main__":
    main()
