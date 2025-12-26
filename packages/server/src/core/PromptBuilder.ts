/**
 * PromptBuilder - Constructs structured prompts for AI Agent workflow execution
 *
 * The prompt structure follows a three-part design:
 * 1. Preamble: Task context, workflow overview, progress indicator
 * 2. Body: Current step instructions with variable substitution
 * 3. Epilogue: Tool instructions and continuation directives
 *
 * All prompt templates are stored in separate Markdown files under src/prompts/
 * for easy maintenance without touching code logic.
 */

import { PROMPT_TEMPLATES } from '../prompts/index.js';

// ============================================================================
// Types
// ============================================================================

export interface TaskContext {
  readonly id: string;
  readonly name: string;
  readonly baseBranch: string;
  readonly baseCommit: string;
  readonly headBranch: string;
  readonly headCommit: string;
}

export interface WorkflowContext {
  readonly name: string;
  readonly nodes: ReadonlyArray<{
    readonly name: string;
    readonly content: string;
  }>;
}

export interface StepContext {
  readonly currentNode: {
    readonly name: string;
    readonly content: string;
  };
  readonly stepIndex: number;
  readonly isLastStep: boolean;
  readonly workspacePath: string;
}

// ============================================================================
// Template Variable Substitution
// ============================================================================

type TemplateVariables = Record<string, string | number>;

/**
 * Replace all template variables in a string
 * Variables use {{variable_name}} syntax
 */
function substituteVariables(template: string, variables: TemplateVariables): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, String(value));
  }

  return result;
}

// ============================================================================
// PromptBuilder Class
// ============================================================================

export class PromptBuilder {
  private task: TaskContext;
  private workflow: WorkflowContext;
  private step: StepContext;

  constructor(task: TaskContext, workflow: WorkflowContext, step: StepContext) {
    this.task = task;
    this.workflow = workflow;
    this.step = step;
  }

  /**
   * Build the complete prompt for the current step
   */
  build(): string {
    const parts: string[] = [
      this.buildPreamble(),
      this.buildStepContent(),
      this.buildToolInstructions(),
      this.buildEpilogue(),
    ];

    return parts.join('\n\n');
  }

  /**
   * Build the preamble section with task context and progress
   */
  private buildPreamble(): string {
    const totalSteps = this.workflow.nodes.length;

    const stepsOverview = this.workflow.nodes
      .map((node, idx) => {
        const isCurrent = idx === this.step.stepIndex;
        const isCompleted = idx < this.step.stepIndex;
        const icon = isCompleted ? '✓' : isCurrent ? '→' : '○';
        const status = isCompleted ? '(done)' : isCurrent ? '(current)' : '';
        return `${icon} **Step ${idx + 1}**: ${node.name} ${status}`;
      })
      .join('\n');

    return substituteVariables(PROMPT_TEMPLATES.preamble, {
      task_name: this.task.name,
      task_id: this.task.id,
      base_branch: this.task.baseBranch,
      base_commit_short: this.task.baseCommit.substring(0, 7),
      head_branch: this.task.headBranch,
      head_commit_short: this.task.headCommit.substring(0, 7),
      workflow_name: this.workflow.name,
      current_step: this.step.stepIndex + 1,
      total_steps: totalSteps,
      steps_overview: stepsOverview,
    });
  }

  /**
   * Build the step content with variable substitution
   */
  private buildStepContent(): string {
    // First substitute workflow node template variables
    const processedNodeContent = substituteVariables(this.step.currentNode.content, {
      base_branch: this.task.baseBranch,
      base_commit: this.task.baseCommit,
      head_branch: this.task.headBranch,
      head_commit: this.task.headCommit,
      task_id: this.task.id,
    });

    // Then substitute step content template
    return substituteVariables(PROMPT_TEMPLATES.stepContent, {
      step_name: this.step.currentNode.name,
      step_content: processedNodeContent,
    });
  }

  /**
   * Build the tool instructions section
   */
  private buildToolInstructions(): string {
    return substituteVariables(PROMPT_TEMPLATES.toolInstructions, {
      task_id: this.task.id,
      workspace_path: this.step.workspacePath,
      base_commit: this.task.baseCommit,
      head_commit: this.task.headCommit,
    });
  }

  /**
   * Build the epilogue with continuation or completion directive
   */
  private buildEpilogue(): string {
    if (this.step.isLastStep) {
      return PROMPT_TEMPLATES.completion;
    }

    return substituteVariables(PROMPT_TEMPLATES.continuation, {
      task_id: this.task.id,
      next_step: this.step.stepIndex + 1,
      workspace_path: this.step.workspacePath,
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Build a code review prompt for the given context
 */
export function buildCodeReviewPrompt(
  task: TaskContext,
  workflow: WorkflowContext,
  currentNode: { name: string; content: string },
  stepIndex: number,
  isLastStep: boolean,
  workspacePath: string
): string {
  const builder = new PromptBuilder(task, workflow, {
    currentNode,
    stepIndex,
    isLastStep,
    workspacePath,
  });

  return builder.build();
}
