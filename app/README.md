# AI Proxy API

A secure FastAPI proxy service that eliminates CORS issues and provides a clean interface for OpenAI and Gemini API calls.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd app
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy the example file
cp env.example .env

# Edit .env with your actual API keys
OPENAI_API_KEY=sk-your-actual-openai-key
GEMINI_API_KEY=your-actual-gemini-key
```

### 3. Start the Service
```bash
# Windows
start.bat

# Unix/Mac
chmod +x start.sh
./start.sh

# Or manually
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 9000
```

The service will be available at `http://localhost:9000`

## 📋 API Endpoints

### Health Check
- `GET /healthz` - Service health status

### OpenAI Proxy
- `POST /api/openai/chat` - Chat completions
- `POST /api/openai/chat/stream` - Streaming chat completions

### Gemini Proxy  
- `POST /api/gemini/generate` - Generate content
- `POST /api/gemini/generate/stream` - Streaming content generation

## 🔧 Configuration

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | - | Your OpenAI API key |
| `GEMINI_API_KEY` | ✅ | - | Your Google Gemini API key |
| `HOST` | ❌ | `0.0.0.0` | Server host |
| `PORT` | ❌ | `9000` | Server port |
| `DEBUG` | ❌ | `true` | Debug mode |
| `CORS_ORIGINS` | ❌ | `http://localhost:8080` | Allowed CORS origins |

### HTTP Client Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Request Timeout | 30s | Total request timeout |
| Read Timeout | 60s | Response read timeout |
| Connect Timeout | 10s | Connection timeout |
| Max Keepalive | 20 | Max keepalive connections |
| Max Connections | 100 | Max total connections |

## 🎯 Usage Examples

### OpenAI Chat
```typescript
import { chatOpenAI } from './services/openai';

const response = await chatOpenAI({
  model: "gpt-4",
  messages: [
    { role: "user", content: "Hello, how are you?" }
  ],
  max_tokens: 100
});
```

### Gemini Generate
```typescript
import { generateGemini } from './services/gemini';

const response = await generateGemini({
  contents: [{
    parts: [{ text: "Hello, how are you?" }]
  }]
}, "gemini-1.5-pro");
```

## 🔒 Security Features

- **No API keys in browser** - All keys stored server-side
- **CORS protection** - Configurable origin restrictions
- **Error sanitization** - Provider errors mapped to consistent format
- **Request validation** - Input validation and sanitization
- **Rate limiting ready** - Infrastructure for future rate limiting

## 🧪 Testing

### Manual Testing
1. Start the proxy service
2. Test health endpoint: `curl http://localhost:9000/healthz`
3. Test OpenAI proxy with a simple request
4. Test Gemini proxy with a simple request

### Automated Testing
```bash
# Run tests (when implemented)
python -m pytest tests/
```

## 🚨 Troubleshooting

### Common Issues

1. **Import Errors**: Make sure all dependencies are installed
2. **API Key Errors**: Verify your `.env` file has correct keys
3. **CORS Issues**: Check that your frontend origin is in `CORS_ORIGINS`
4. **Port Conflicts**: Change `PORT` in `.env` if 9000 is busy

### Debug Mode
Set `DEBUG=true` in `.env` for detailed logging and error messages.

## 📚 API Documentation

Once running, visit `http://localhost:9000/docs` for interactive API documentation (Swagger UI).

## 🔄 Integration with Frontend

The frontend should now call these proxy endpoints instead of the AI providers directly:

- Replace `https://api.openai.com/v1/chat/completions` with `/api/openai/chat`
- Replace `https://generativelanguage.googleapis.com/v1beta/models/...` with `/api/gemini/generate`

This eliminates CORS issues and provides a secure, centralized way to handle AI API calls.


