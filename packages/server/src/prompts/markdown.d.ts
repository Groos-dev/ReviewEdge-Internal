/**
 * TypeScript declaration for importing Markdown files as raw strings
 */
declare module '*.md' {
  const content: string;
  export default content;
}
