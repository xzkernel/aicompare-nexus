import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronDown } from 'lucide-react';

interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  category: string;
  description: string;
}

interface PromptTemplatesProps {
  onSelectTemplate: (template: PromptTemplate) => void;
}

const templates: PromptTemplate[] = [
  {
    id: '1',
    name: 'Code Review',
    category: 'Development',
    description: 'Review and improve code quality',
    prompt: 'Please review this code and provide suggestions for improvement, including best practices, potential bugs, and performance optimizations:'
  },
  {
    id: '2',
    name: 'Content Writing',
    category: 'Writing',
    description: 'Create engaging content',
    prompt: 'Write a compelling article about [topic] that is informative, engaging, and optimized for SEO. Include relevant examples and actionable insights.'
  },
  {
    id: '3',
    name: 'Problem Solving',
    category: 'Analysis',
    description: 'Break down complex problems',
    prompt: 'I\'m facing this challenge: [describe problem]. Please help me break it down into manageable steps and suggest potential solutions.'
  },
  {
    id: '4',
    name: 'Data Analysis',
    category: 'Analytics',
    description: 'Analyze and interpret data',
    prompt: 'I have this dataset: [describe data]. Please help me analyze it, identify key insights, and suggest visualizations that would be most effective.'
  },
  {
    id: '5',
    name: 'Creative Writing',
    category: 'Writing',
    description: 'Generate creative stories',
    prompt: 'Write a creative story based on this premise: [describe premise]. Make it engaging, with vivid descriptions and an interesting plot.'
  },
  {
    id: '6',
    name: 'Technical Documentation',
    category: 'Development',
    description: 'Create clear documentation',
    prompt: 'Please help me write clear, comprehensive documentation for this [software/feature]. Include examples, use cases, and troubleshooting tips.'
  }
];

export const PromptTemplates = ({ onSelectTemplate }: PromptTemplatesProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const categories = [...new Set(templates.map(t => t.category))];

  const getCategoryColor = (category: string) => {
    const colors = {
      'Development': 'bg-[#5B8CFF]/10 text-[#5B8CFF] border-[#5B8CFF]/20',
      'Writing': 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/20',
      'Analysis': 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20',
      'Analytics': 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
    };
    return colors[category as keyof typeof colors] || 'bg-[#9AA4B2]/10 text-[#9AA4B2] border-[#9AA4B2]/20';
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-[#9AA4B2] hover:text-[#E6EAF2] hover:bg-[#1E2433] transition-colors"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Templates
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-80 bg-[#121622] border border-[#1E2433] shadow-xl p-2"
      >
        <div className="p-2">
          <h3 className="text-sm font-semibold text-[#E6EAF2] mb-3">Prompt Templates</h3>
          <div className="space-y-2">
            {categories.map(category => (
              <div key={category} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className={`${getCategoryColor(category)} text-xs px-2 py-1`}
                  >
                    {category}
                  </Badge>
                </div>
                <div className="space-y-1 ml-2">
                  {templates
                    .filter(t => t.category === category)
                    .map(template => (
                      <DropdownMenuItem
                        key={template.id}
                        onClick={() => {
                          onSelectTemplate(template);
                          setIsOpen(false);
                        }}
                        className="flex flex-col items-start p-3 text-left hover:bg-[#1E2433] rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-sm font-medium text-[#E6EAF2]">
                            {template.name}
                          </span>
                        </div>
                        <p className="text-xs text-[#9AA4B2] leading-relaxed">
                          {template.description}
                        </p>
                      </DropdownMenuItem>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
