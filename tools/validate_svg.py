#!/usr/bin/env python3
"""Validate every generated Vkusfera illustrated cookbook SVG against XML parser."""
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

if len(sys.argv) != 2:
    raise SystemExit("Usage: python3 tools/validate_svg.py DIRECTORY")
root = Path(sys.argv[1])
files = sorted(root.glob("*.svg"))
assert len(files) == 579, f"Expected 579 SVG covers, found {len(files)}"
for filepath in files:
    try:
        element = ET.parse(filepath).getroot()
    except ET.ParseError as err:
        raise SystemExit(f"Malformed recipe cover {filepath.name}: {err}")
    assert element.tag == "{http://www.w3.org/2000/svg}svg", filepath.name
    assert element.attrib.get("viewBox") == "0 0 520 320", filepath.name
print(f"XML validated for all {len(files)} individual recipe covers.")
