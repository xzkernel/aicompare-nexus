#!/usr/bin/env python3
"""
Test script to verify the backend setup
Run this after setting up your environment variables
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing imports...")
    
    try:
        from config import settings
        print("✅ Config imported successfully")
        
        from models import User, Subscription, UsageLog, PlanType
        print("✅ Models imported successfully")
        
        from database import get_db, init_db
        print("✅ Database imported successfully")
        
        from auth import get_current_user, check_and_increment_usage
        print("✅ Auth imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False

def test_config():
    """Test if configuration is loaded correctly"""
    print("\nTesting configuration...")
    
    try:
        from config import settings
        
        # Check required environment variables
        required_vars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY', 
            'SUPABASE_JWT_SECRET',
            'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'STRIPE_PRICE_BASIC',
            'STRIPE_PRICE_PRO',
            'DATABASE_URL'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not hasattr(settings, var) or not getattr(settings, var):
                missing_vars.append(var)
        
        if missing_vars:
            print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
            return False
        else:
            print("✅ All required environment variables are set")
            return True
            
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def test_database_connection():
    """Test database connection"""
    print("\nTesting database connection...")
    
    try:
        from database import engine
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            print("✅ Database connection successful")
            return True
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_models():
    """Test if models can be created"""
    print("\nTesting models...")
    
    try:
        from models import User, Subscription, UsageLog, PlanType
        
        # Test model creation (without saving to DB)
        user = User(
            id="test-uuid",
            email="test@example.com"
        )
        
        subscription = Subscription(
            user_id="test-uuid",
            plan=PlanType.BASIC,
            status="active"
        )
        
        usage_log = UsageLog(
            user_id="test-uuid",
            date="2024-01-01",
            prompts_count=5,
            input_tokens=100,
            output_tokens=200
        )
        
        print("✅ Models can be instantiated successfully")
        return True
        
    except Exception as e:
        print(f"❌ Model test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing ModelWise Backend Setup\n")
    
    tests = [
        test_imports,
        test_config,
        test_database_connection,
        test_models
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your backend is ready to run.")
        print("\nNext steps:")
        print("1. Run: uvicorn main:app --reload")
        print("2. Visit: http://localhost:8000/docs")
        print("3. Test the API endpoints")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()


