import OpenAI from "openai";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

export interface OptimizationRecommendation {
  type: 'performance' | 'security' | 'best-practice' | 'alternative';
  title: string;
  description: string;
  code?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  line?: number;
}

export interface ScriptOptimizationResult {
  performance: OptimizationRecommendation[];
  security: OptimizationRecommendation[];
  bestPractices: OptimizationRecommendation[];
  alternatives: {
    title: string;
    description: string;
    code: string;
    approach: string;
  }[];
  summary: string;
}

export async function generateScriptDocumentation(code: string): Promise<string> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a PowerShell documentation expert. Generate comprehensive comment-based help documentation for PowerShell scripts following Microsoft standards.

Format your response as PowerShell comment-based help with:
1. .SYNOPSIS - Brief description
2. .DESCRIPTION - Detailed explanation
3. .PARAMETER - For each parameter
4. .EXAMPLE - Usage examples
5. .NOTES - Additional information

Keep it professional, concise, and actionable.`
        },
        {
          role: "user",
          content: `Generate comment-based help documentation for this PowerShell script:\n\n${code}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "# Documentation generation failed";
  } catch (error) {
    console.error('Error generating documentation:', error);
    throw new Error('Failed to generate documentation');
  }
}

export async function applyScriptOptimizations(
  code: string, 
  recommendations: OptimizationRecommendation[]
): Promise<string> {
  try {
    const openai = getOpenAIClient();
    
    // Build a summary of recommendations to apply
    const recommendationsSummary = recommendations.map((rec, idx) => 
      `${idx + 1}. [${rec.priority?.toUpperCase() || 'MEDIUM'}] ${rec.title}: ${rec.description}${rec.code ? `\n   Suggested code: ${rec.code}` : ''}${rec.line ? ` (Line ${rec.line})` : ''}`
    ).join('\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert PowerShell developer. Your task is to apply the given optimization recommendations to the provided PowerShell script.

Instructions:
1. Apply ALL the recommendations provided to improve the script
2. Maintain the script's core functionality - do not change what the script does
3. Apply security fixes, performance improvements, and best practices
4. Add proper error handling if recommended
5. Preserve existing comments and add new ones where helpful
6. Return ONLY the modified PowerShell script, no explanations

Output the complete, optimized PowerShell script ready for use.`
        },
        {
          role: "user",
          content: `Apply these recommendations to the PowerShell script below:

RECOMMENDATIONS:
${recommendationsSummary}

ORIGINAL SCRIPT:
${code}

Return the optimized script with all recommendations applied:`
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    const optimizedScript = response.choices[0].message.content || code;
    
    // Clean up any markdown code blocks if present
    let cleanedScript = optimizedScript.trim();
    if (cleanedScript.startsWith('```powershell')) {
      cleanedScript = cleanedScript.slice(13);
    } else if (cleanedScript.startsWith('```')) {
      cleanedScript = cleanedScript.slice(3);
    }
    if (cleanedScript.endsWith('```')) {
      cleanedScript = cleanedScript.slice(0, -3);
    }
    
    return cleanedScript.trim();
  } catch (error) {
    console.error('Error applying optimizations:', error);
    throw new Error('Failed to apply script optimizations');
  }
}

export async function analyzeScriptOptimization(code: string): Promise<ScriptOptimizationResult> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert PowerShell performance analyst and security auditor. Analyze PowerShell scripts and provide:

1. **Performance optimizations**: Identify inefficient patterns, suggest parallel processing, loop improvements, memory optimization
2. **Security issues**: Detect hardcoded credentials, unsafe cmdlets, privilege escalation risks, code injection vulnerabilities
3. **Best practices**: Missing error handling, parameter validation, approved verbs, comment-based help, WhatIf/Confirm support
4. **Alternative approaches**: Provide 2-3 different ways to accomplish the same goal with pros/cons

Return your analysis as a JSON object with this structure:
{
  "performance": [{"type": "performance", "title": "...", "description": "...", "code": "...", "priority": "high", "line": 10}],
  "security": [{"type": "security", "title": "...", "description": "...", "priority": "critical", "line": 5}],
  "bestPractices": [{"type": "best-practice", "title": "...", "description": "...", "code": "...", "priority": "medium"}],
  "alternatives": [{"title": "...", "description": "...", "code": "...", "approach": "Pipeline-based"}],
  "summary": "Overall assessment..."
}

Be specific, actionable, and reference line numbers when possible. Focus on real improvements, not nitpicks.`
        },
        {
          role: "user",
          content: `Analyze this PowerShell script and provide optimization recommendations:\n\n${code}`
        }
      ],
      temperature: 0.2,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    
    return {
      performance: result.performance || [],
      security: result.security || [],
      bestPractices: result.bestPractices || [],
      alternatives: result.alternatives || [],
      summary: result.summary || "No optimization recommendations found."
    };
  } catch (error) {
    console.error('Error analyzing script:', error);
    throw new Error('Failed to analyze script for optimization');
  }
}
