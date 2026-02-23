# EMBER – Real-Time Smoking Awareness Tracker

## Product Overview
EMBER is a premium, dark-themed mobile app that tracks cigarette consumption with visceral visual and haptic feedback. It's an awareness + reduction tool — NOT a quitting app. The tone is neutral, observational, and calm.

## Architecture
- **Frontend**: React Native (Expo SDK 54) with expo-router tab navigation
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Animations**: react-native-reanimated for 60fps animations
- **Charts**: react-native-svg for custom bar charts
- **Haptics**: expo-haptics for tactile feedback

## Core Features (Phase 1 - Implemented)

### 1. Home Screen (Track Tab)
- Central glowing ember visualization with breathing animation
- Dynamic color system: 0 cigs=green → 3=yellow → 6=orange → 10=red → 15+=crimson
- +/- buttons with haptic feedback and ember flash animation
- Animated counter display
- "Delay 5 Minutes" countdown timer with SVG circular progress
- Limit exceeded detection with screen shake and neutral messaging
- Unstable ember jitter when over limit

### 2. Analytics Tab
- Today's count with yesterday comparison
- Stats grid: Daily avg, Weekly total, Monthly total, Delay streak
- SVG bar chart (last 7 days) with ember-colored bars
- Money spent tracking (weekly/monthly)
- Health recovery timeline (informational milestones)

### 3. Settings Tab
- Daily limit adjustment with +/- buttons
- Price per cigarette input
- Sound effects toggle
- Reset today's count
- Generate sample data (for testing)

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/logs/today | Get today's smoking log |
| POST | /api/logs/increment | Add a cigarette |
| POST | /api/logs/decrement | Remove a cigarette |
| GET | /api/logs/history | Get historical logs |
| GET | /api/settings | Get user settings |
| PUT | /api/settings | Update settings |
| POST | /api/delays/start | Start a delay timer |
| POST | /api/delays/{id}/complete | Complete a delay |
| GET | /api/delays/streak | Get delay streak count |
| GET | /api/analytics/summary | Get full analytics summary |
| POST | /api/logs/reset-today | Reset today's count |
| POST | /api/seed | Generate sample data |

## Data Model (MongoDB)
- **daily_logs**: {id, date, count, events[], created_at, updated_at}
- **user_settings**: {id, daily_limit, cigarette_price, currency, sound_enabled, delay_duration}
- **delay_logs**: {id, date, started_at, completed, duration_seconds}

## Phase 2 (Future)
- Friends list with username-based connections
- Private leaderboard (% reduction, delay streak, lowest avg)
- Social sync with cloud authentication
