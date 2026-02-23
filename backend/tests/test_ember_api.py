"""
EMBER API Backend Tests
Tests for smoking tracker backend endpoints
"""
import pytest
import requests
import os
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env to get PUBLIC_URL
frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
if frontend_env.exists():
    load_dotenv(frontend_env)

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://ember-pulse.preview.emergentagent.com').rstrip('/')

class TestHealth:
    """Basic health checks"""
    
    def test_api_root(self):
        """Test API root endpoint returns version info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "EMBER" in data["message"]


class TestLogsEndpoints:
    """Tests for daily log tracking endpoints"""
    
    def test_get_today_log(self):
        """Test GET /api/logs/today returns today's log"""
        response = requests.get(f"{BASE_URL}/api/logs/today")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "count" in data
        assert "events" in data
        assert isinstance(data["count"], int)
        assert isinstance(data["events"], list)
    
    def test_increment_count(self):
        """Test POST /api/logs/increment increases count"""
        # Get current count
        before_response = requests.get(f"{BASE_URL}/api/logs/today")
        before_count = before_response.json()["count"]
        
        # Increment
        response = requests.post(f"{BASE_URL}/api/logs/increment")
        assert response.status_code == 200
        
        data = response.json()
        assert data["count"] == before_count + 1
        assert "events" in data
        assert len(data["events"]) > 0
        
        # Verify with GET
        verify_response = requests.get(f"{BASE_URL}/api/logs/today")
        assert verify_response.json()["count"] == before_count + 1
    
    def test_decrement_count(self):
        """Test POST /api/logs/decrement decreases count"""
        # First increment to ensure count > 0
        requests.post(f"{BASE_URL}/api/logs/increment")
        
        # Get current count
        before_response = requests.get(f"{BASE_URL}/api/logs/today")
        before_count = before_response.json()["count"]
        
        if before_count > 0:
            # Decrement
            response = requests.post(f"{BASE_URL}/api/logs/decrement")
            assert response.status_code == 200
            
            data = response.json()
            assert data["count"] == before_count - 1
            
            # Verify persistence
            verify_response = requests.get(f"{BASE_URL}/api/logs/today")
            assert verify_response.json()["count"] == before_count - 1
    
    def test_decrement_at_zero(self):
        """Test decrement doesn't go below zero"""
        # Reset today's count to 0
        requests.post(f"{BASE_URL}/api/logs/reset-today")
        
        # Try to decrement
        response = requests.post(f"{BASE_URL}/api/logs/decrement")
        assert response.status_code == 200
        
        data = response.json()
        assert data["count"] == 0
    
    def test_reset_today(self):
        """Test POST /api/logs/reset-today resets count to 0"""
        # Increment a few times
        for _ in range(3):
            requests.post(f"{BASE_URL}/api/logs/increment")
        
        # Reset
        response = requests.post(f"{BASE_URL}/api/logs/reset-today")
        assert response.status_code == 200
        
        data = response.json()
        assert data["count"] == 0
        assert len(data["events"]) == 0
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/logs/today")
        assert verify_response.json()["count"] == 0
    
    def test_history_endpoint(self):
        """Test GET /api/logs/history returns historical logs"""
        response = requests.get(f"{BASE_URL}/api/logs/history?days=30")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If there's data, verify structure
        if len(data) > 0:
            entry = data[0]
            assert "date" in entry
            assert "count" in entry
            assert "events" in entry


class TestSettingsEndpoints:
    """Tests for user settings endpoints"""
    
    def test_get_settings(self):
        """Test GET /api/settings returns settings"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "daily_limit" in data
        assert "cigarette_price" in data
        assert "currency" in data
        assert "sound_enabled" in data
        assert isinstance(data["daily_limit"], int)
        assert isinstance(data["cigarette_price"], float)
    
    def test_update_daily_limit(self):
        """Test PUT /api/settings updates daily limit"""
        # Update daily limit
        new_limit = 15
        response = requests.put(
            f"{BASE_URL}/api/settings",
            json={"daily_limit": new_limit}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["daily_limit"] == new_limit
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/settings")
        assert verify_response.json()["daily_limit"] == new_limit
    
    def test_update_cigarette_price(self):
        """Test PUT /api/settings updates cigarette price"""
        new_price = 0.75
        response = requests.put(
            f"{BASE_URL}/api/settings",
            json={"cigarette_price": new_price}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["cigarette_price"] == new_price
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/settings")
        assert verify_response.json()["cigarette_price"] == new_price
    
    def test_update_sound_enabled(self):
        """Test PUT /api/settings updates sound setting"""
        response = requests.put(
            f"{BASE_URL}/api/settings",
            json={"sound_enabled": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["sound_enabled"] is True
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/settings")
        assert verify_response.json()["sound_enabled"] is True


class TestDelayEndpoints:
    """Tests for delay/streak endpoints"""
    
    def test_start_delay(self):
        """Test POST /api/delays/start creates a delay log"""
        response = requests.post(f"{BASE_URL}/api/delays/start")
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "date" in data
        assert "started_at" in data
        assert "duration_seconds" in data
        assert data["completed"] is False
        
        # Return delay_id for next test
        return data["id"]
    
    def test_complete_delay(self):
        """Test POST /api/delays/{id}/complete marks delay as completed"""
        # Start a delay first
        start_response = requests.post(f"{BASE_URL}/api/delays/start")
        delay_id = start_response.json()["id"]
        
        # Complete it
        response = requests.post(f"{BASE_URL}/api/delays/{delay_id}/complete")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == delay_id
        assert data["completed"] is True
    
    def test_delay_streak(self):
        """Test GET /api/delays/streak returns streak info"""
        response = requests.get(f"{BASE_URL}/api/delays/streak")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_completed" in data
        assert "today_completed" in data
        assert isinstance(data["total_completed"], int)
        assert isinstance(data["today_completed"], int)


class TestAnalyticsEndpoints:
    """Tests for analytics endpoints"""
    
    def test_analytics_summary(self):
        """Test GET /api/analytics/summary returns comprehensive summary"""
        response = requests.get(f"{BASE_URL}/api/analytics/summary")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all required fields
        assert "today" in data
        assert "yesterday" in data
        assert "difference" in data
        assert "weekly_total" in data
        assert "monthly_total" in data
        assert "daily_average" in data
        assert "money_spent_weekly" in data
        assert "money_spent_monthly" in data
        assert "currency" in data
        assert "delay_streak" in data
        assert "daily_data" in data
        
        # Verify types
        assert isinstance(data["today"], int)
        assert isinstance(data["weekly_total"], int)
        assert isinstance(data["monthly_total"], int)
        assert isinstance(data["daily_average"], (int, float))
        assert isinstance(data["money_spent_weekly"], (int, float))
        assert isinstance(data["money_spent_monthly"], (int, float))
        assert isinstance(data["daily_data"], list)
        
        # Verify daily_data structure
        if len(data["daily_data"]) > 0:
            entry = data["daily_data"][0]
            assert "date" in entry
            assert "count" in entry


class TestSeedData:
    """Tests for seed data functionality"""
    
    def test_seed_data(self):
        """Test POST /api/seed generates sample data"""
        response = requests.post(f"{BASE_URL}/api/seed")
        assert response.status_code == 200
        
        data = response.json()
        assert "seeded_days" in data
        assert isinstance(data["seeded_days"], int)
        assert data["seeded_days"] >= 0
        
        # Verify data was actually created
        history_response = requests.get(f"{BASE_URL}/api/logs/history?days=30")
        history_data = history_response.json()
        assert len(history_data) > 0
