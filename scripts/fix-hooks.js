const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, 'hooks');

const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(hooksDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Reemplazar `await supabase.from` por `await (supabase as any).from`
  content = content.replace(/await supabase\n?\s*\.from\(/g, 'await (supabase as any)\n        .from(');
  
  // Reemplazar `await supabase.rpc` por `await (supabase as any).rpc`
  content = content.replace(/await supabase\n?\s*\.rpc\(/g, 'await (supabase as any)\n        .rpc(');

  // Reemplazar supabase sin await (ej en variables o returns directos) - cuidado con no romper auth
  // Mejor usamos un regex estricto para `.from` y `.rpc` aunque no tengan `await` justo antes.
  content = content.replace(/supabase\s*\.from\(/g, '(supabase as any).from(');
  content = content.replace(/supabase\s*\.rpc\(/g, '(supabase as any).rpc(');

  // Limpiar posibles duplicados `((supabase as any) as any)` por si pasamos dos veces
  content = content.replace(/\(supabase as any\) as any/g, 'supabase as any');
  
  // En use-credit-cards ya pusimos algunos `(supabase as any)`, no pasa nada, se arreglan.

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log("Done");
