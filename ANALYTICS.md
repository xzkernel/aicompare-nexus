# 📊 Analytics Dashboard Documentation

This document describes the client-side analytics dashboard that tracks prompt usage, model choice, and response times.

## 🎯 **Overview**

The Analytics Dashboard provides real-time insights into how users interact with the ModelWise application. All data is stored locally in the browser's localStorage and includes comprehensive metrics about:

- **Prompt Usage**: Total prompts, average length, success rates
- **Model Performance**: Response times, usage counts, error rates
- **Activity Timeline**: Chronological view of all interactions
- **Performance Metrics**: Response time trends and patterns

## 🚀 **Features**

### **1. Overview Dashboard**
- **Total Prompts**: Count of all prompts sent
- **Success Rate**: Percentage of successful API calls
- **Average Response Time**: Mean response time across all models
- **Models Used**: Number of unique AI models accessed
- **Recent Activity**: Latest 5 interactions with status

### **2. Model Performance**
- **Usage Count**: How many times each model was called
- **Success/Error Rates**: Success and failure counts per model
- **Average Response Time**: Mean response time per model
- **Performance Comparison**: Side-by-side model metrics

### **3. Prompt Analysis**
- **Prompt History**: Complete list of all prompts sent
- **Length Analysis**: Character count statistics
- **Response Details**: Individual model response times
- **Error Tracking**: Failed requests with error details

### **4. Activity Timeline**
- **Chronological View**: Time-based activity tracking
- **Model Combinations**: Which models were used together
- **Performance Trends**: Response time patterns over time
- **Quick Overview**: Condensed activity summary

## 🔧 **Technical Implementation**

### **Data Storage**
```typescript
interface AnalyticsEntry {
  id: string;                    // Unique identifier
  timestamp: number;             // Unix timestamp
  prompt: string;                // User's prompt text
  leftModel: string;             // Left column model
  rightModel: string;            // Right column model
  leftResponseTime: number;      // Left model response time (ms)
  rightResponseTime: number;     // Right model response time (ms)
  promptLength: number;          // Character count
  success: boolean;              // API call success status
  error?: string;                // Error message if failed
}
```

### **Local Storage**
- **Key**: `ai-compare-analytics`
- **Format**: JSON array of AnalyticsEntry objects
- **Limit**: Last 1000 entries (prevents localStorage overflow)
- **Persistence**: Survives browser restarts

### **Performance Considerations**
- **Lazy Loading**: Data loaded only when dashboard opens
- **Efficient Calculations**: Stats computed on-demand
- **Memory Management**: Automatic cleanup of old entries
- **Export Functionality**: JSON download for data analysis

## 📈 **Metrics & Calculations**

### **Prompt Statistics**
```typescript
interface PromptStats {
  totalPrompts: number;          // Total number of prompts
  avgPromptLength: number;       // Average characters per prompt
  totalResponseTime: number;     // Sum of all response times
  avgResponseTime: number;       // Mean response time
  successRate: number;           // Percentage of successful calls
}
```

### **Model Statistics**
```typescript
interface ModelStats {
  model: string;                 // Model name/identifier
  usageCount: number;            // Number of times used
  avgResponseTime: number;       // Average response time
  totalResponseTime: number;     // Total response time
  successCount: number;          // Successful calls
  errorCount: number;            // Failed calls
}
```

### **Calculation Methods**
- **Success Rate**: `(successful_calls / total_calls) * 100`
- **Average Response Time**: `total_response_time / total_calls`
- **Model Usage**: Aggregated counts per model
- **Performance Trends**: Time-based response time analysis

## 🎨 **User Interface**

### **Dashboard Access**
- **Floating Button**: Fixed position bottom-right corner
- **Badge Counter**: Shows total number of entries
- **Quick Access**: Always visible, one-click open

### **Tab Navigation**
1. **Overview**: Summary cards and recent activity
2. **Models**: Model performance comparison
3. **Prompts**: Detailed prompt history
4. **Timeline**: Chronological activity view

### **Interactive Elements**
- **Export Button**: Download analytics as JSON
- **Clear Button**: Remove all analytics data
- **Close Button**: Return to main interface
- **Responsive Design**: Works on all screen sizes

## 📊 **Data Export & Analysis**

### **Export Format**
```json
[
  {
    "id": "uuid-string",
    "timestamp": 1703123456789,
    "prompt": "Explain quantum computing",
    "leftModel": "ChatGPT-5",
    "rightModel": "Gemini 2.5 Pro",
    "leftResponseTime": 1250,
    "rightResponseTime": 980,
    "promptLength": 25,
    "success": true
  }
]
```

### **Analysis Use Cases**
- **Performance Monitoring**: Track response time trends
- **Model Comparison**: Compare AI model effectiveness
- **User Behavior**: Understand prompt patterns
- **Error Analysis**: Identify common failure points
- **Capacity Planning**: Monitor API usage patterns

## 🔒 **Privacy & Security**

### **Data Storage**
- **Local Only**: All data stays in user's browser
- **No External Sharing**: No data sent to external services
- **User Control**: Full control over data retention
- **Clear Function**: Easy data removal option

### **Data Sensitivity**
- **Prompt Content**: Stored as-is (may contain sensitive information)
- **No Encryption**: Standard localStorage security
- **Browser Privacy**: Subject to browser privacy settings
- **User Responsibility**: Users manage their own data

## 🚀 **Future Enhancements**

### **Planned Features**
- **Charts & Graphs**: Visual data representation
- **Filtering**: Date range and model filtering
- **Search**: Prompt content search functionality
- **Trends**: Performance trend analysis
- **Alerts**: Performance threshold notifications

### **Advanced Analytics**
- **Response Quality**: Content analysis metrics
- **User Patterns**: Usage pattern recognition
- **Model Recommendations**: AI model suggestions
- **Performance Optimization**: Response time optimization tips

## 🧪 **Testing & Validation**

### **Test Scenarios**
1. **Data Persistence**: Verify localStorage functionality
2. **Performance**: Test with large datasets
3. **Export**: Validate JSON export format
4. **Error Handling**: Test with malformed data
5. **Responsiveness**: Test on various screen sizes

### **Validation Methods**
- **Console Logging**: Debug information in browser console
- **Data Inspection**: Direct localStorage examination
- **Export Verification**: Validate exported JSON structure
- **Performance Monitoring**: Track dashboard load times

## 📚 **Integration Guide**

### **Adding Analytics to Components**
```typescript
import { useAnalytics } from '@/hooks/use-analytics';

const MyComponent = () => {
  const { addEntry } = useAnalytics();
  
  const handleAction = () => {
    // Track user action
    addEntry({
      prompt: "User prompt",
      leftModel: "Model A",
      rightModel: "Model B",
      leftResponseTime: 1000,
      rightResponseTime: 1200,
      promptLength: 20,
      success: true
    });
  };
};
```

### **Custom Metrics**
```typescript
// Add custom fields to analytics
addEntry({
  // ... standard fields
  customField: "custom value",
  metadata: {
    userPreference: "setting",
    context: "additional info"
  }
});
```

## 🎯 **Best Practices**

### **Data Collection**
- **Consistent Format**: Always use the same data structure
- **Error Handling**: Capture and log all error conditions
- **Performance**: Minimize impact on user experience
- **Privacy**: Respect user data preferences

### **Dashboard Usage**
- **Regular Monitoring**: Check analytics periodically
- **Data Export**: Backup important data regularly
- **Performance Review**: Monitor response time trends
- **Error Analysis**: Investigate failure patterns

---

**The Analytics Dashboard provides comprehensive insights into application usage while maintaining user privacy and data control. Use it to optimize performance and understand user behavior patterns! 📊**


