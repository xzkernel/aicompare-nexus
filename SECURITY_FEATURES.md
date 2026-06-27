# 🛡️ Security Features Overview

This document outlines the security enhancements implemented in ModelWise.

## 🔒 **Rate Limiting**

### **What It Does**
- Limits requests per IP address to prevent abuse
- Configurable limits: per-minute and per-hour
- Automatic cleanup of old request records
- Proper HTTP 429 responses with retry headers

### **Configuration**
```env
# Rate limiting settings
RATE_LIMIT_PER_MINUTE=60    # Requests per minute per IP
RATE_LIMIT_PER_HOUR=1000    # Requests per hour per IP
```

### **Response Headers**
```
X-RateLimit-Limit-Minute: 60
X-RateLimit-Limit-Hour: 1000
X-RateLimit-Remaining-Minute: 45
X-RateLimit-Remaining-Hour: 950
Retry-After: 60
```

### **Testing**
```bash
# Test rate limiting
cd backend
python test_rate_limit.py
```

## 🚨 **Error Boundaries**

### **What It Does**
- Catches React rendering errors gracefully
- Prevents single component crashes from breaking the entire app
- Provides user-friendly error messages
- Includes retry and navigation options

### **Implementation**
- Each `OutputCard` is wrapped in an `ErrorBoundary`
- Custom error UI with action buttons
- Development mode shows detailed error information
- Production mode shows user-friendly messages

### **Features**
- **Try Again**: Reset the error boundary state
- **Go Home**: Navigate back to home page
- **Error Details**: Development-only detailed error information
- **Graceful Degradation**: App continues working even if one card fails

## 🔐 **Secrets Management**

### **What It Does**
- All sensitive data stored in environment variables
- No hardcoded API keys or secrets
- Comprehensive documentation for production deployment
- Support for multiple cloud platforms

### **Security Principles**
- ✅ **Environment Variables**: All secrets via environment
- ✅ **No Git Commits**: `.env` files excluded from version control
- ✅ **Platform Integration**: Native secrets management for each platform
- ✅ **Documentation**: Complete setup guides for all major platforms

### **Supported Platforms**
- **Vercel**: Environment variables in dashboard
- **Fly.io**: `fly secrets set` command
- **Render**: Environment variables in service settings
- **Railway**: Variables tab in project dashboard
- **Heroku**: `heroku config:set` command
- **Docker**: `.env` file or Docker secrets
- **Kubernetes**: Kubernetes secrets

## 🧪 **Testing & Validation**

### **Rate Limiting Tests**
```bash
# Run comprehensive rate limiting tests
cd backend
python test_rate_limit.py

# Test includes:
# - Single request validation
# - Rate limit triggering
# - Header verification
# - Retry after limit reset
# - API endpoint testing
```

### **Error Boundary Tests**
- Test with malformed Markdown
- Test with invalid API responses
- Test component rendering errors
- Verify graceful error handling

### **Security Validation**
```bash
# Check environment variables
docker exec -it <container> env | grep -E "(API|RATE)"

# Verify rate limiting headers
curl -I http://localhost:8000/health

# Test rate limit enforcement
for i in {1..70}; do curl http://localhost:8000/health; done
```

## 📊 **Monitoring & Observability**

### **Rate Limiting Metrics**
- Requests per IP tracking
- Rate limit violations logging
- Header information for monitoring
- Automatic cleanup of old data

### **Error Tracking**
- Error boundary catches logged to console
- Custom error handlers supported
- Production error reporting ready
- User action tracking for errors

### **Health Checks**
- Backend health endpoint with rate limit info
- Frontend health endpoint for monitoring
- Docker health checks for containers
- Comprehensive logging for debugging

## 🚀 **Production Deployment**

### **Environment Setup**
1. **Copy template**: `cp backend/env.example .env`
2. **Configure secrets**: Edit `.env` with actual values
3. **Deploy**: Use platform-specific deployment commands
4. **Verify**: Test rate limiting and error handling

### **Security Checklist**
- [ ] API keys configured via environment
- [ ] Rate limiting enabled and configured
- [ ] CORS origins properly set
- [ ] Error boundaries deployed
- [ ] Health checks responding
- [ ] Rate limit headers present
- [ ] No secrets in logs or responses

### **Monitoring Setup**
- Monitor rate limit violations
- Track error boundary usage
- Alert on unusual API activity
- Log security events appropriately

## 🔧 **Configuration Examples**

### **Development Environment**
```env
OPENAI_API_KEY=sk-your-dev-key
GOOGLE_API_KEY=your-dev-google-key
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_PER_HOUR=2000
```

### **Production Environment**
```env
OPENAI_API_KEY=sk-your-prod-key
GOOGLE_API_KEY=your-prod-google-key
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
PROD_ORIGINS=https://yourdomain.com
```

### **Docker Compose**
```yaml
environment:
  - RATE_LIMIT_PER_MINUTE=${RATE_LIMIT_PER_MINUTE:-60}
  - RATE_LIMIT_PER_HOUR=${RATE_LIMIT_PER_HOUR:-1000}
```

## 📚 **Additional Resources**

- [SECRETS.md](./SECRETS.md) - Complete secrets management guide
- [DEPLOY.md](./DEPLOY.md) - Production deployment instructions
- [DOCKER.md](./DOCKER.md) - Docker usage and security
- [Backend Rate Limiting Tests](./backend/test_rate_limit.py)

---

**Security is a continuous process. Regularly review and update these features! 🛡️**

