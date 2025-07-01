#!/bin/bash

# GitHub Labels Setup Script for Release Drafter
# Run with: bash scripts/setup-labels.sh

set -e

echo "🏷️  Setting up GitHub labels for release-drafter..."

# Version bump labels
gh label create "major" --description "Major version bump (breaking changes)" --color "d73a49" --force
gh label create "minor" --description "Minor version bump (new features)" --color "0366d6" --force
gh label create "patch" --description "Patch version bump (bug fixes)" --color "28a745" --force
gh label create "breaking" --description "Breaking change" --color "d73a49" --force

# Feature labels
gh label create "feature" --description "New feature" --color "0366d6" --force
gh label create "enhancement" --description "Enhancement to existing feature" --color "a2eeef" --force

# Bug fix labels
gh label create "fix" --description "Bug fix" --color "d73a49" --force
gh label create "bugfix" --description "Bug fix" --color "d73a49" --force
gh label create "bug" --description "Bug report" --color "d73a49" --force

# Performance labels
gh label create "performance" --description "Performance improvement" --color "fbca04" --force
gh label create "optimization" --description "Code optimization" --color "fbca04" --force

# Documentation labels
gh label create "documentation" --description "Documentation update" --color "0075ca" --force
gh label create "docs" --description "Documentation" --color "0075ca" --force

# Maintenance labels
gh label create "chore" --description "Maintenance task" --color "fef2c0" --force
gh label create "dependencies" --description "Dependency update" --color "0366d6" --force
gh label create "maintenance" --description "Repository maintenance" --color "fef2c0" --force

echo "✅ All labels created successfully!"
echo ""
echo "Usage examples:"
echo "  • Add 'feature' label to PRs for minor version bumps"
echo "  • Add 'fix' label to PRs for patch version bumps"
echo "  • Add 'breaking' label to PRs for major version bumps"
echo ""
echo "Release-drafter will now automatically categorize and version your releases!"