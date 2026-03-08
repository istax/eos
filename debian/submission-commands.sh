#!/usr/bin/env bash
set -euo pipefail

echo "Install build dependencies (Debian/Ubuntu):"
echo "  sudo apt update"
echo "  sudo apt install -y devscripts debhelper dh-python python3-all lintian"
echo
echo "Build package:"
echo "  dpkg-buildpackage -us -uc -b"
echo
echo "Run lintian:"
echo "  lintian ../eos-breathing-room_1.0.0-1_all.deb"
echo
echo "Submit workflow:"
echo "  1) File ITP using debian/wnpp-itp-template.txt"
echo "  2) Upload source package to mentors.debian.net"
echo "  3) File RFS using debian/rfs-template.txt"
