import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, DollarSign, Zap } from 'lucide-react';

interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

interface ModelPricing {
  inputCostPer1K: number;
  outputCostPer1K: number;
  maxTokens: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-5.5': {
    inputCostPer1K: 0.003,
    outputCostPer1K: 0.012,
    maxTokens: 1000000
  },
  'gpt-5-mini': {
    inputCostPer1K: 0.0004,
    outputCostPer1K: 0.0016,
    maxTokens: 400000
  },
  'gemini-3.1-pro-preview': {
    inputCostPer1K: 0.002,
    outputCostPer1K: 0.012,
    maxTokens: 1000000
  },
  'gemini-3.5-flash': {
    inputCostPer1K: 0.00015,
    outputCostPer1K: 0.0006,
    maxTokens: 1000000
  },
  'claude-sonnet-4-6': {
    inputCostPer1K: 0.003,
    outputCostPer1K: 0.015,
    maxTokens: 1000000
  },
  'claude-opus-4-8': {
    inputCostPer1K: 0.005,
    outputCostPer1K: 0.025,
    maxTokens: 1000000
  },
};

// Rough token estimation (4 characters ≈ 1 token for English text)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function CostEstimator() {
  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt-5-mini', 'gemini-3.5-flash']);
  const [estimatedOutputLength, setEstimatedOutputLength] = useState(500);

  const estimates = useMemo(() => {
    if (!prompt.trim()) return [];

    const inputTokens = estimateTokens(prompt);
    const outputTokens = estimateTokens('x'.repeat(estimatedOutputLength));

    return selectedModels.map(model => {
      const pricing = MODEL_PRICING[model];
      if (!pricing) return null;

      const totalTokens = inputTokens + outputTokens;
      const inputCost = (inputTokens / 1000) * pricing.inputCostPer1K;
      const outputCost = (outputTokens / 1000) * pricing.outputCostPer1K;
      const totalCost = inputCost + outputCost;

      return {
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost: totalCost,
        pricing
      };
    }).filter(Boolean);
  }, [prompt, selectedModels, estimatedOutputLength]);

  const totalCost = estimates.reduce((sum, est) => sum + (est?.estimatedCost || 0), 0);

  const toggleModel = (model: string) => {
    setSelectedModels(prev => 
      prev.includes(model) 
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Cost Estimator
        </CardTitle>
        <CardDescription>
          Estimate the cost of your AI requests before sending them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt Input */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Your Prompt</Label>
          <Input
            id="prompt"
            placeholder="Enter your prompt to estimate costs..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Input tokens: {prompt ? estimateTokens(prompt) : 0}
          </p>
        </div>

        {/* Estimated Output Length */}
        <div className="space-y-2">
          <Label htmlFor="output-length">Estimated Output Length (characters)</Label>
          <Input
            id="output-length"
            type="number"
            value={estimatedOutputLength}
            onChange={(e) => setEstimatedOutputLength(Number(e.target.value))}
            min="100"
            max="10000"
          />
          <p className="text-sm text-muted-foreground">
            Output tokens: {estimateTokens('x'.repeat(estimatedOutputLength))}
          </p>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label>Select Models to Compare</Label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(MODEL_PRICING).map(model => (
              <Button
                key={model}
                variant={selectedModels.includes(model) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleModel(model)}
              >
                {model}
              </Button>
            ))}
          </div>
        </div>

        {/* Cost Estimates */}
        {estimates.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Cost Estimates</h4>
              <Badge variant="secondary" className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Total: ${totalCost.toFixed(4)}
              </Badge>
            </div>

            <div className="space-y-2">
              {estimates.map((estimate) => (
                <div
                  key={estimate!.model}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div>
                    <div className="font-medium">{estimate!.model}</div>
                    <div className="text-sm text-muted-foreground">
                      {estimate!.totalTokens} tokens total
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${estimate!.estimatedCost.toFixed(4)}</div>
                    <div className="text-sm text-muted-foreground">
                      ${estimate!.pricing.inputCostPer1K}/1K in, ${estimate!.pricing.outputCostPer1K}/1K out
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <strong>Disclaimer:</strong> These are rough estimates based on current pricing (as of 2024). 
          Actual costs may vary based on model usage, token counting accuracy, and pricing changes. 
          Always check current pricing with your AI provider.
        </div>
      </CardContent>
    </Card>
  );
}


