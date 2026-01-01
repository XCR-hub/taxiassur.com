export const criticalCSS = `
  *,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}
  html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;tab-size:4;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"}
  body{margin:0;line-height:inherit}
  .container{width:100%;max-width:1280px;margin-left:auto;margin-right:auto;padding-left:1rem;padding-right:1rem}
  .btn{display:inline-flex;align-items:center;justify-content:center;border-radius:0.375rem;padding:0.5rem 1rem;font-weight:500;transition-property:all;transition-timing-function:cubic-bezier(0.4,0,0.2,1);transition-duration:150ms}
  .btn-primary{background-color:#2563eb;color:#fff}
  .btn-primary:hover{background-color:#1d4ed8}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
`;

export function injectCriticalCSS() {
  if (typeof document === 'undefined') return;

  const existingStyle = document.getElementById('critical-css');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'critical-css';
  style.textContent = criticalCSS;
  document.head.insertBefore(style, document.head.firstChild);
}

export function extractCriticalCSS() {
  if (typeof document === 'undefined') return '';

  const styles = Array.from(document.styleSheets);
  const criticalSelectors = new Set<string>();
  const viewportHeight = window.innerHeight;

  const elements = document.querySelectorAll('*');
  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < viewportHeight) {
      const classes = Array.from(el.classList);
      classes.forEach((cls) => criticalSelectors.add(`.${cls}`));
    }
  });

  let criticalStyles = '';
  styles.forEach((sheet) => {
    try {
      const rules = Array.from(sheet.cssRules || []);
      rules.forEach((rule) => {
        if (rule instanceof CSSStyleRule) {
          const selector = rule.selectorText;
          if (
            criticalSelectors.has(selector) ||
            selector.includes('body') ||
            selector.includes('html') ||
            selector.includes('*')
          ) {
            criticalStyles += rule.cssText + '\n';
          }
        }
      });
    } catch (e) {
      // Skip external stylesheets due to CORS
    }
  });

  return criticalStyles;
}
