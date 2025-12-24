/**
 * Type declarations for CSS imports with ?raw query parameter
 */

declare module '*.css?raw' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}
