#!/usr/bin/env python3
"""
Backend API Testing for EduTrack Parent App
Tests all backend endpoints according to test_result.md requirements
"""

import requests
import json
import time
import sys
from typing import Dict, Any

# Backend URL from frontend/.env
BACKEND_URL = "https://parent-bus-tracker.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.results = []
        self.session = requests.Session()
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()

    def test_login_valid(self):
        """Test POST /api/login with valid credentials"""
        try:
            url = f"{BACKEND_URL}/login"
            payload = {
                "email": "parent@school.com",
                "password": "password123"
            }
            
            response = self.session.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("success") == True and 
                    data.get("parent_id") == "parent_001" and 
                    data.get("name") == "Sarah Johnson"):
                    self.log_result("Login Valid Credentials", True, 
                                  f"Login successful for {data.get('name')}", data)
                    return True
                else:
                    self.log_result("Login Valid Credentials", False, 
                                  "Response format incorrect", data)
            else:
                self.log_result("Login Valid Credentials", False, 
                              f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Login Valid Credentials", False, f"Exception: {str(e)}")
        return False

    def test_login_invalid(self):
        """Test POST /api/login with invalid credentials"""
        try:
            url = f"{BACKEND_URL}/login"
            payload = {
                "email": "wrong@email.com",
                "password": "wrongpassword"
            }
            
            response = self.session.post(url, json=payload)
            
            if response.status_code == 401:
                self.log_result("Login Invalid Credentials", True, 
                              "Correctly rejected invalid credentials")
                return True
            else:
                self.log_result("Login Invalid Credentials", False, 
                              f"Expected 401, got {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Login Invalid Credentials", False, f"Exception: {str(e)}")
        return False

    def test_get_children(self):
        """Test GET /api/children/{parent_id}"""
        try:
            url = f"{BACKEND_URL}/children/parent_001"
            
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 2:
                    # Check if both children have required fields
                    required_fields = ["id", "name", "class_name", "bus_info", "home_location"]
                    all_valid = True
                    for child in data:
                        for field in required_fields:
                            if field not in child:
                                all_valid = False
                                break
                        if not all_valid:
                            break
                    
                    if all_valid:
                        self.log_result("Get Children List", True, 
                                      f"Retrieved {len(data)} children with complete details", 
                                      [child["name"] for child in data])
                        return True
                    else:
                        self.log_result("Get Children List", False, 
                                      "Missing required fields in children data", data)
                else:
                    self.log_result("Get Children List", False, 
                                  f"Expected 2 children, got {len(data) if isinstance(data, list) else 'non-list'}", 
                                  data)
            else:
                self.log_result("Get Children List", False, 
                              f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Children List", False, f"Exception: {str(e)}")
        return False

    def test_get_child_valid(self):
        """Test GET /api/child/{child_id} with valid ID"""
        try:
            url = f"{BACKEND_URL}/child/child_001"
            
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "name", "class_name", "bus_info", "home_location"]
                
                if all(field in data for field in required_fields):
                    self.log_result("Get Child Valid ID", True, 
                                  f"Retrieved child details for {data.get('name')}", 
                                  data.get("name"))
                    return True
                else:
                    self.log_result("Get Child Valid ID", False, 
                                  "Missing required fields", data)
            else:
                self.log_result("Get Child Valid ID", False, 
                              f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Child Valid ID", False, f"Exception: {str(e)}")
        return False

    def test_get_child_invalid(self):
        """Test GET /api/child/{child_id} with invalid ID"""
        try:
            url = f"{BACKEND_URL}/child/invalid_child_id"
            
            response = self.session.get(url)
            
            if response.status_code == 404:
                self.log_result("Get Child Invalid ID", True, 
                              "Correctly returned 404 for invalid child ID")
                return True
            else:
                self.log_result("Get Child Invalid ID", False, 
                              f"Expected 404, got {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Child Invalid ID", False, f"Exception: {str(e)}")
        return False

    def test_bus_location_simulation(self):
        """Test GET /api/bus/{bus_id}/location and verify GPS simulation"""
        try:
            url = f"{BACKEND_URL}/bus/bus_001/location"
            
            # First call
            response1 = self.session.get(url)
            if response1.status_code != 200:
                self.log_result("Bus Location Simulation", False, 
                              f"First call failed: HTTP {response1.status_code}", response1.text)
                return False
            
            data1 = response1.json()
            
            # Wait 3 seconds
            time.sleep(3)
            
            # Second call
            response2 = self.session.get(url)
            if response2.status_code != 200:
                self.log_result("Bus Location Simulation", False, 
                              f"Second call failed: HTTP {response2.status_code}", response2.text)
                return False
            
            data2 = response2.json()
            
            # Check if coordinates changed (GPS simulation working)
            lat_changed = data1.get("latitude") != data2.get("latitude")
            lng_changed = data1.get("longitude") != data2.get("longitude")
            
            required_fields = ["bus_id", "latitude", "longitude", "eta_minutes", "status", "timestamp"]
            has_all_fields = all(field in data1 for field in required_fields)
            
            if has_all_fields and (lat_changed or lng_changed):
                self.log_result("Bus Location Simulation", True, 
                              f"GPS simulation working - coordinates changed between calls", 
                              {
                                  "call1": f"({data1.get('latitude'):.6f}, {data1.get('longitude'):.6f})",
                                  "call2": f"({data2.get('latitude'):.6f}, {data2.get('longitude'):.6f})"
                              })
                return True
            elif not has_all_fields:
                self.log_result("Bus Location Simulation", False, 
                              "Missing required fields in response", data1)
            else:
                self.log_result("Bus Location Simulation", False, 
                              "GPS simulation not working - coordinates didn't change", 
                              {
                                  "call1": f"({data1.get('latitude'):.6f}, {data1.get('longitude'):.6f})",
                                  "call2": f"({data2.get('latitude'):.6f}, {data2.get('longitude'):.6f})"
                              })
        except Exception as e:
            self.log_result("Bus Location Simulation", False, f"Exception: {str(e)}")
        return False

    def test_bus_location_bus002(self):
        """Test GET /api/bus/{bus_id}/location with bus_002"""
        try:
            url = f"{BACKEND_URL}/bus/bus_002/location"
            
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["bus_id", "latitude", "longitude", "eta_minutes", "status", "timestamp"]
                
                if all(field in data for field in required_fields) and data.get("bus_id") == "bus_002":
                    self.log_result("Bus Location Bus002", True, 
                                  f"Retrieved bus_002 location successfully", 
                                  f"({data.get('latitude'):.6f}, {data.get('longitude'):.6f})")
                    return True
                else:
                    self.log_result("Bus Location Bus002", False, 
                                  "Missing required fields or wrong bus_id", data)
            else:
                self.log_result("Bus Location Bus002", False, 
                              f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Bus Location Bus002", False, f"Exception: {str(e)}")
        return False

    def test_school_location(self):
        """Test GET /api/school/location"""
        try:
            url = f"{BACKEND_URL}/school/location"
            
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                if "latitude" in data and "longitude" in data:
                    self.log_result("School Location", True, 
                                  f"Retrieved school location", 
                                  f"({data.get('latitude')}, {data.get('longitude')})")
                    return True
                else:
                    self.log_result("School Location", False, 
                                  "Missing latitude/longitude in response", data)
            else:
                self.log_result("School Location", False, 
                              f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("School Location", False, f"Exception: {str(e)}")
        return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting EduTrack Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        tests = [
            self.test_login_valid,
            self.test_login_invalid,
            self.test_get_children,
            self.test_get_child_valid,
            self.test_get_child_invalid,
            self.test_bus_location_simulation,
            self.test_bus_location_bus002,
            self.test_school_location
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All backend tests PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} tests FAILED")
            return False

def main():
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()