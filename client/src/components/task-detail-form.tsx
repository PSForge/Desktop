import { useState } from "react";
import { ADTask, ADTaskParameter } from "@/lib/ad-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Code } from "lucide-react";

interface TaskDetailFormProps {
  task: ADTask;
  onBack: () => void;
  onGenerateScript: (script: string) => void;
}

export function TaskDetailForm({ task, onBack, onGenerateScript }: TaskDetailFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    task.parameters.forEach(param => {
      initial[param.id] = param.defaultValue ?? '';
    });
    return initial;
  });

  const handleInputChange = (paramId: string, value: any) => {
    setFormData(prev => ({ ...prev, [paramId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const script = task.scriptTemplate(formData);
    onGenerateScript(script);
  };

  const renderInput = (param: ADTaskParameter) => {
    const value = formData[param.id] ?? '';

    switch (param.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={param.id}
              checked={value}
              onCheckedChange={(checked) => handleInputChange(param.id, checked)}
              data-testid={`input-${param.id}`}
            />
            <Label htmlFor={param.id} className="cursor-pointer">
              {param.label}
            </Label>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={param.id}>
              {param.label}
              {param.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleInputChange(param.id, val)}
            >
              <SelectTrigger id={param.id} data-testid={`input-${param.id}`}>
                <SelectValue placeholder={`Select ${param.label}`} />
              </SelectTrigger>
              <SelectContent>
                {param.options?.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {param.description && (
              <p className="text-xs text-muted-foreground">{param.description}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={param.id}>
              {param.label}
              {param.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={param.id}
              value={value}
              onChange={(e) => handleInputChange(param.id, e.target.value)}
              placeholder={param.placeholder}
              required={param.required}
              rows={3}
              data-testid={`input-${param.id}`}
            />
            {param.description && (
              <p className="text-xs text-muted-foreground">{param.description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={param.id}>
              {param.label}
              {param.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={param.id}
              type="number"
              value={value}
              onChange={(e) => handleInputChange(param.id, parseInt(e.target.value) || '')}
              placeholder={param.placeholder}
              required={param.required}
              data-testid={`input-${param.id}`}
            />
            {param.description && (
              <p className="text-xs text-muted-foreground">{param.description}</p>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={param.id}>
              {param.label}
              {param.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={param.id}
              type={param.type}
              value={value}
              onChange={(e) => handleInputChange(param.id, e.target.value)}
              placeholder={param.placeholder}
              required={param.required}
              data-testid={`input-${param.id}`}
            />
            {param.description && (
              <p className="text-xs text-muted-foreground">{param.description}</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4"
          data-testid="button-back-to-tasks"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{task.name}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
            <div className="mt-2">
              <span className="inline-block px-2 py-1 text-xs rounded-md bg-primary/10 text-primary">
                {task.category}
              </span>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {task.parameters.map(param => (
                <div key={param.id}>
                  {renderInput(param)}
                </div>
              ))}
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" data-testid="button-generate-script">
                <Code className="h-4 w-4 mr-2" />
                Generate PowerShell Script
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
