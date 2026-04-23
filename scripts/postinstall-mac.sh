#!/bin/bash
# Post-install script to refresh macOS icon cache
# This fixes the issue where the app icon doesn't appear in Launchpad on first install

echo "Refreshing macOS icon cache..."

# Clear icon cache
sudo rm -rf /Library/Caches/com.apple.iconservices.store 2>/dev/null

# Restart Dock to refresh Launchpad
killall Dock 2>/dev/null

echo "Icon cache refreshed. The app icon should now appear in Launchpad."