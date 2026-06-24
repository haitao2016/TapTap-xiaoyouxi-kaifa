# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Features

- Initial project setup with monorepo structure
- Core build service for Unity project building
- Debug server for game debugging
- Event bus system for inter-module communication
- Plugin system with sandbox support
- Theme system with dark/light mode support
- Responsive layout for multi-device support

### Bug Fixes

- Fixed build cancellation logic to only cancel target tasks
- Fixed process leak when cancelling Unity builds
- Fixed crypto module import issues
- Fixed build completion handling for cancelled tasks

### Documentation

- Added CONTRIBUTING.md for contributor guidelines
- Added GitHub issue templates for bug reports and feature requests