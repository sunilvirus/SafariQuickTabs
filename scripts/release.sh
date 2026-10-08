#!/bin/bash
# ==============================================================================
# Quick Tabs — Release Artifacts Generator
# Builds the Release target and outputs both the .app, .zip, and .dmg to dist/
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

DIST_DIR="$REPO_ROOT/dist"
BUILD_DIR="$REPO_ROOT/build"
STAGING_DIR="$DIST_DIR/dmg_staging"
APP_NAME="Quick Tabs.app"
DMG_NAME="QuickTabs.dmg"
ZIP_NAME="QuickTabs.zip"

echo "=========================================="
echo "🚀 Quick Tabs — Generating Release Build"
echo "=========================================="

# 1. Clean previous release & staging artifacts
rm -rf "$DIST_DIR" "$BUILD_DIR"
mkdir -p "$DIST_DIR" "$STAGING_DIR"

# 2. Build Release configuration
echo "🔨 Compiling Release build via xcodebuild..."
xcodebuild -project "Quick Tabs/Quick Tabs.xcodeproj" \
           -scheme "Quick Tabs" \
           -configuration Release \
           -derivedDataPath "$BUILD_DIR" \
           build | grep -E '(BUILD SUCCEEDED|BUILD FAILED|error:)' || true

RELEASE_APP="$BUILD_DIR/Build/Products/Release/$APP_NAME"

if [ ! -d "$RELEASE_APP" ]; then
    echo "❌ Error: Build failed or $RELEASE_APP does not exist."
    exit 1
fi

# 3. Copy .app to dist/
echo "📦 Packaging standalone app into dist/..."
cp -R "$RELEASE_APP" "$DIST_DIR/$APP_NAME"

# 4. Create .zip archive of the .app (standard for GitHub Releases)
echo "🗜️  Creating $ZIP_NAME..."
(cd "$DIST_DIR" && ditto -c -k --sequesterRsrc --keepParent "$APP_NAME" "$ZIP_NAME")

# 5. Create .dmg installer with Applications symlink
echo "💿 Creating $DMG_NAME installer..."
cp -R "$RELEASE_APP" "$STAGING_DIR/"
ln -s /Applications "$STAGING_DIR/Applications"

hdiutil create -volname "Quick Tabs" \
               -srcfolder "$STAGING_DIR" \
               -ov \
               -format UDZO \
               "$DIST_DIR/$DMG_NAME" > /dev/null

# 6. Clean up temporary staging and intermediate build artifacts
rm -rf "$STAGING_DIR" "$BUILD_DIR"

echo "=========================================="
echo "✅ Release artifacts generated successfully in dist/:"
echo "------------------------------------------"
ls -lh "$DIST_DIR"
echo "=========================================="
echo "• App bundle:  dist/$APP_NAME"
echo "• DMG package: dist/$DMG_NAME"
echo "• Zip package: dist/$ZIP_NAME"
echo "=========================================="
