# NameNest - Product Requirements Document

## Overview
NameNest is a name availability checker and suggestion tool.

## Features
- [ ] Multi-platform name availability checking
- [ ] AI-powered name suggestions
- [ ] Domain availability lookup
- [ ] Social media handle checking
- [ ] Result caching for performance

## Architecture
- **Backend**: Python / Flask REST API
- **Frontend**: React with Tailwind CSS
- **Caching**: In-memory (upgradeable to Redis)

## API Endpoints
| Method | Endpoint            | Description                     |
|--------|---------------------|---------------------------------|
| GET    | /api/health         | Health check                    |
| POST   | /api/check          | Check name availability         |
| POST   | /api/suggestions    | Get name suggestions            |

## Status
🚧 Project scaffolded — implementation pending.
