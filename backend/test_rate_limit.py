#!/usr/bin/env python3
"""
Test script for rate limiting functionality
Run this to verify rate limiting is working correctly
"""

import asyncio
import httpx
import time
from typing import List

async def test_rate_limiting(base_url: str = "http://localhost:8000"):
    """Test rate limiting by making multiple rapid requests"""
    
    async with httpx.AsyncClient() as client:
        print(f"🧪 Testing rate limiting at {base_url}")
        print("=" * 50)
        
        # Test 1: Single request (should succeed)
        print("\n1️⃣ Testing single request...")
        try:
            response = await client.get(f"{base_url}/health")
            print(f"✅ Health check: {response.status_code}")
            
            # Check rate limit headers
            headers = response.headers
            print(f"📊 Rate limit headers:")
            print(f"   Minute limit: {headers.get('X-RateLimit-Limit-Minute', 'N/A')}")
            print(f"   Hour limit: {headers.get('X-RateLimit-Limit-Hour', 'N/A')}")
            print(f"   Minute remaining: {headers.get('X-RateLimit-Remaining-Minute', 'N/A')}")
            print(f"   Hour remaining: {headers.get('X-RateLimit-Remaining-Hour', 'N/A')}")
            
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return
        
        # Test 2: Multiple rapid requests to trigger rate limiting
        print("\n2️⃣ Testing rapid requests to trigger rate limiting...")
        
        # Make requests faster than the rate limit
        requests_per_second = 2  # 2 requests per second = 120 per minute
        total_requests = 70  # Should trigger rate limit at 60 per minute
        
        print(f"   Making {total_requests} requests at {requests_per_second} req/sec...")
        print(f"   Expected: Rate limit triggered around request 60-65")
        
        success_count = 0
        rate_limited_count = 0
        other_errors = 0
        
        start_time = time.time()
        
        for i in range(total_requests):
            try:
                response = await client.get(f"{base_url}/health")
                
                if response.status_code == 200:
                    success_count += 1
                    remaining = response.headers.get('X-RateLimit-Remaining-Minute', 'N/A')
                    print(f"   Request {i+1:2d}: ✅ Success (remaining: {remaining})")
                elif response.status_code == 429:
                    rate_limited_count += 1
                    retry_after = response.headers.get('Retry-After', 'N/A')
                    print(f"   Request {i+1:2d}: 🚫 Rate limited (retry after: {retry_after}s)")
                else:
                    other_errors += 1
                    print(f"   Request {i+1:2d}: ❌ Error {response.status_code}")
                
                # Small delay between requests
                await asyncio.sleep(1 / requests_per_second)
                
            except Exception as e:
                other_errors += 1
                print(f"   Request {i+1:2d}: ❌ Exception: {e}")
        
        elapsed_time = time.time() - start_time
        
        # Test 3: Wait and retry after rate limit
        if rate_limited_count > 0:
            print(f"\n3️⃣ Waiting 65 seconds for rate limit to reset...")
            print("   (You can interrupt with Ctrl+C if you want to skip this)")
            
            try:
                await asyncio.sleep(65)
                
                print("\n4️⃣ Testing retry after rate limit reset...")
                response = await client.get(f"{base_url}/health")
                
                if response.status_code == 200:
                    print("✅ Retry successful after rate limit reset")
                    remaining = response.headers.get('X-RateLimit-Remaining-Minute', 'N/A')
                    print(f"   Remaining requests: {remaining}")
                else:
                    print(f"❌ Retry failed: {response.status_code}")
                    
            except KeyboardInterrupt:
                print("\n⏭️ Skipping retry test")
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total requests made: {total_requests}")
        print(f"Successful requests: {success_count}")
        print(f"Rate limited requests: {rate_limited_count}")
        print(f"Other errors: {other_errors}")
        print(f"Total time: {elapsed_time:.2f} seconds")
        print(f"Average rate: {total_requests/elapsed_time:.2f} req/sec")
        
        if rate_limited_count > 0:
            print("\n✅ Rate limiting is working correctly!")
        else:
            print("\n⚠️  Rate limiting may not be working (no 429 responses)")
            print("   Check your RATE_LIMIT_PER_MINUTE setting")

async def test_api_endpoint(base_url: str = "http://localhost:8000"):
    """Test the actual API endpoint with rate limiting"""
    
    print(f"\n🧪 Testing API endpoint rate limiting at {base_url}")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        # Make a few API calls to test rate limiting
        for i in range(5):
            try:
                response = await client.post(
                    f"{base_url}/ask",
                    json={
                        "prompt": f"Test prompt {i+1}",
                        "leftModel": "gpt-5",
                        "rightModel": "gemini-2.0-flash-exp"
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    print(f"✅ API request {i+1}: Success")
                elif response.status_code == 429:
                    print(f"🚫 API request {i+1}: Rate limited")
                    retry_after = response.headers.get('Retry-After', 'N/A')
                    print(f"   Retry after: {retry_after} seconds")
                else:
                    print(f"❌ API request {i+1}: Error {response.status_code}")
                
                # Check rate limit headers
                headers = response.headers
                remaining_minute = headers.get('X-RateLimit-Remaining-Minute', 'N/A')
                remaining_hour = headers.get('X-RateLimit-Remaining-Hour', 'N/A')
                print(f"   Remaining: {remaining_minute} per minute, {remaining_hour} per hour")
                
                # Small delay between requests
                await asyncio.sleep(2)
                
            except Exception as e:
                print(f"❌ API request {i+1}: Exception: {e}")

if __name__ == "__main__":
    print("🚀 ModelWise - Rate Limiting Test")
    print("Make sure your backend is running on http://localhost:8000")
    print()
    
    try:
        # Test health endpoint rate limiting
        asyncio.run(test_rate_limiting())
        
        # Test API endpoint rate limiting
        asyncio.run(test_api_endpoint())
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed: {e}")
    
    print("\n🏁 Rate limiting test completed!")

