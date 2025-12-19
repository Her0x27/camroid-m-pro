import JavaScriptObfuscator from 'javascript-obfuscator';
import type { Plugin } from 'vite';

export function obfuscatorPlugin(): Plugin {
  return {
    name: 'vite-obfuscator',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        return html.replace(/<script>([^<]*)<\/script>/g, (match, code) => {
          try {
            if (code.trim().length === 0) return match;
            
            const result = JavaScriptObfuscator.obfuscate(code, {
              compact: true,
              controlFlowFlattening: false,
              deadCodeInjection: false,
              debugProtection: false,
              debugProtectionInterval: false,
              disableConsoleOutput: true,
              identifierNamesGenerator: 'hexadecimal',
              log: false,
              renameGlobals: false,
              rotateStringArray: true,
              selfDefending: false,
              stringArray: true,
              stringArrayThreshold: 0.75,
              unicodeEscapeSequence: false,
            } as any);
            
            return `<script>${result.obfuscatedCode}</script>`;
          } catch (error) {
            console.warn('[Obfuscator] Failed to obfuscate inline script:', error);
            return match;
          }
        });
      },
    },
    renderChunk(code: string) {
      try {
        const result = JavaScriptObfuscator.obfuscate(code, {
          compact: true,
          controlFlowFlattening: false,
          deadCodeInjection: false,
          debugProtection: false,
          debugProtectionInterval: false,
          disableConsoleOutput: true,
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          renameGlobals: true,
          rotateStringArray: true,
          selfDefending: false,
          stringArray: true,
          stringArrayThreshold: 0.75,
          unicodeEscapeSequence: false,
        } as any);

        return {
          code: result.obfuscatedCode,
          map: null,
        };
      } catch (error) {
        console.warn('[Obfuscator] Failed to obfuscate chunk:', error);
        return null;
      }
    },
  };
}
