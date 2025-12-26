/**
 * Prompt Templates Module
 *
 * Loads and exports all system prompt templates from Markdown files.
 * This separation allows non-developers to easily modify prompts without
 * touching the code logic.
 *
 * Template Variables:
 * - {{task_id}}: Review task ID
 * - {{task_name}}: Task display name
 * - {{base_branch}}: Base branch name
 * - {{base_commit}}: Full base commit hash
 * - {{base_commit_short}}: Short base commit hash (7 chars)
 * - {{head_branch}}: Head branch name
 * - {{head_commit}}: Full head commit hash
 * - {{head_commit_short}}: Short head commit hash (7 chars)
 * - {{workflow_name}}: Workflow display name
 * - {{current_step}}: Current step number (1-based)
 * - {{total_steps}}: Total number of steps
 * - {{steps_overview}}: Formatted step list
 * - {{step_name}}: Current step name
 * - {{step_content}}: Current step content
 * - {{workspace_path}}: Workspace path
 * - {{next_step}}: Next step index (0-based)
 */

// Import raw Markdown templates
import completionTemplate from './completion.md';
import continuationTemplate from './continuation.md';
import preambleTemplate from './preamble.md';
import stepContentTemplate from './step-content.md';
import toolInstructionsTemplate from './tool-instructions.md';

// ============================================================================
// Template Exports
// ============================================================================

export const PROMPT_TEMPLATES = {
  /**
   * Task context and workflow progress header
   */
  preamble: preambleTemplate,

  /**
   * Current step content wrapper
   */
  stepContent: stepContentTemplate,

  /**
   * Tool usage instructions for adding comments
   */
  toolInstructions: toolInstructionsTemplate,

  /**
   * Directive for continuing to next step
   */
  continuation: continuationTemplate,

  /**
   * Directive for final step completion
   */
  completion: completionTemplate,
} as const;

export type PromptTemplateKey = keyof typeof PROMPT_TEMPLATES;
