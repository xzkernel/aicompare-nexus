# 🔐 Production Secrets Management Guide

This guide covers how to securely manage API keys and sensitive configuration in production environments.

## 🚨 **IMPORTANT: Never Commit Secrets to Version Control**

- ❌ Never commit `.env` files to Git
- ❌ Never hardcode API keys in source code
- ❌ Never share secrets in logs or error messages
- ✅ Always use environment variables or secure secret management services

## 🔧 **Local Development**

### Environment File Setup
```bash
# Copy the template (safe to commit)
cp backend/env.example .env

# Edit .env with your actual keys (NEVER commit this file)
# .env is already in .gitignore
```

### Local .env Structure
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-openai-key-here
OPENAI_MODEL=gpt-5

# Google Gemini Configuration
GOOGLE_API_KEY=your-actual-google-key-here
GOOGLE_MODEL=gemini-2.0-flash-exp

# Rate Limiting Configuration
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# Production CORS Origins (comma-separated)
PROD_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## ☁️ **Cloud Platform Secrets Management**

### Option 1: Vercel (Frontend)
1. **Go to your project dashboard**
2. **Navigate to Settings → Environment Variables**
3. **Add environment variables:**
   ```
    VITE_API_URL=https://your-backend-url.com
   ```

### Option 2: Fly.io (Backend)
```bash
# Set secrets securely
fly secrets set OPENAI_API_KEY="sk-your-actual-key"
fly secrets set GOOGLE_API_KEY="your-actual-google-key"
fly secrets set RATE_LIMIT_PER_MINUTE="60"
fly secrets set RATE_LIMIT_PER_HOUR="1000"
fly secrets set PROD_ORIGINS="https://yourdomain.com"

# Deploy
fly deploy
```

### Option 3: Render (Backend)
1. **Go to your service dashboard**
2. **Navigate to Environment → Environment Variables**
3. **Add each variable:**
   ```
   OPENAI_API_KEY=sk-your-actual-key
   GOOGLE_API_KEY=your-actual-google-key
   RATE_LIMIT_PER_MINUTE=60
   RATE_LIMIT_PER_HOUR=1000
   PROD_ORIGINS=https://yourdomain.com
   ```

### Option 4: Railway (Backend)
1. **Go to your project dashboard**
2. **Navigate to Variables tab**
3. **Add environment variables**
4. **Railway automatically redeploys when variables change**

### Option 5: Heroku (Backend)
```bash
# Set config vars
heroku config:set OPENAI_API_KEY="sk-your-actual-key"
heroku config:set GOOGLE_API_KEY="your-actual-google-key"
heroku config:set RATE_LIMIT_PER_MINUTE="60"
heroku config:set RATE_LIMIT_PER_HOUR="1000"
heroku config:set PROD_ORIGINS="https://yourdomain.com"

# Deploy
git push heroku main
```

## 🐳 **Docker Secrets Management**

### Docker Compose with .env
```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# The .env file is read automatically by docker-compose
```

### Docker Swarm Secrets
```bash
# Create secrets
echo "sk-your-actual-openai-key" | docker secret create openai_api_key -
echo "your-actual-google-key" | docker secret create google_api_key -

# Use in docker-compose.yml
secrets:
  openai_api_key:
    external: true
  google_api_key:
    external: true
```

### Kubernetes Secrets
```yaml
# Create secret
apiVersion: v1
kind: Secret
metadata:
  name: ai-compare-secrets
type: Opaque
data:
  openai-api-key: <base64-encoded-key>
  google-api-key: <base64-encoded-key>

---
# Use in deployment
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: backend
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-compare-secrets
              key: openai-api-key
```

## 🔒 **Security Best Practices**

### 1. **Secret Rotation**
- Rotate API keys regularly (every 90 days)
- Use different keys for different environments
- Monitor API usage for suspicious activity

### 2. **Access Control**
- Limit who has access to production secrets
- Use role-based access control (RBAC)
- Audit secret access regularly

### 3. **Monitoring & Alerting**
- Monitor API rate limits and usage
- Set up alerts for unusual API activity
- Log secret access (without exposing values)

### 4. **Backup & Recovery**
- Backup secret configurations securely
- Document recovery procedures
- Test secret rotation procedures

## 🚨 **Emergency Procedures**

### If Secrets Are Compromised
1. **Immediately rotate the compromised key**
2. **Check for unauthorized usage**
3. **Review access logs**
4. **Update all environments**
5. **Notify stakeholders**

### Secret Recovery
```bash
# Example: Rotate OpenAI key
# 1. Generate new key in OpenAI dashboard
# 2. Update production environment
fly secrets set OPENAI_API_KEY="sk-new-key"

# 3. Verify the change
fly ssh console
env | grep OPENAI_API_KEY

# 4. Restart service
fly deploy
```

## 📋 **Environment Variable Reference**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | - | OpenAI API key for GPT models |
| `GOOGLE_API_KEY` | ✅ | - | Google API key for Gemini models |
| `OPENAI_MODEL` | ❌ | `gpt-5` | OpenAI model to use |
| `GOOGLE_MODEL` | ❌ | `gemini-2.0-flash-exp` | Google model to use |
| `RATE_LIMIT_PER_MINUTE` | ❌ | `60` | Requests per minute per IP |
| `RATE_LIMIT_PER_HOUR` | ❌ | `1000` | Requests per hour per IP |
| `PROD_ORIGINS` | ❌ | - | Comma-separated CORS origins |

## 🔍 **Validation & Testing**

### Test Secret Configuration
```bash
# Test backend health
curl https://your-backend.com/health

# Test API endpoint (with rate limiting)
curl -X POST https://your-backend.com/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","leftModel":"gpt-5","rightModel":"gemini-2.0-flash-exp"}'
```

### Verify Environment Variables
```bash
# In Docker container
docker exec -it <container-name> env | grep API

# In production environment
fly ssh console
env | grep -E "(OPENAI|GOOGLE|RATE_LIMIT)"
```

## 📚 **Additional Resources**

- [OpenAI API Key Management](https://platform.openai.com/api-keys)
- [Google AI Studio API Keys](https://makersuite.google.com/app/apikey)
- [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [12 Factor App - Config](https://12factor.net/config)

---

**Remember: Security is everyone's responsibility. When in doubt, ask for help! 🔐**

