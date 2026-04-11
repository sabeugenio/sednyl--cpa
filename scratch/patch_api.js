const fs = require('fs');

let apiCode = fs.readFileSync('src/utils/api.js', 'utf8');

// 1. Add imports and error handling
apiCode = apiCode.replace(
  "import { supabase } from './supabase.js';",
  "import { supabase } from './supabase.js';\nimport { sileo } from 'sileo';"
);

apiCode = apiCode.replace(
  "  if (!res.ok) {\n    const errorBody = await res.json().catch(() => ({}));\n    throw new Error(errorBody.error || `API error: ${res.status}`);\n  }\n\n  return res.json();",
  `  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const errMsg = errorBody.error || \`API error: \${res.status}\`;
    sileo.error(errMsg);
    throw new Error(errMsg);
  }

  const result = await res.json();
  if (options.successMessage) {
    sileo.success(options.successMessage);
  }
  return result;`
);

// Helper to patch specific methods
function addSuccessMsg(methodRegex, msg) {
  apiCode = apiCode.replace(methodRegex, `$1\n    successMessage: '${msg}',`);
}

// 2. Patch methods
addSuccessMsg(/(apiFetch\(\`\/playlists\`,\s*\{\n\s*method:\s*'POST',)/, "Playlist saved");
addSuccessMsg(/(apiFetch\(\`\/topics\`,\s*\{\n\s*method:\s*'POST',)/, "Topic added");
addSuccessMsg(/(apiFetch\(\`\/topics\/\$\{id\}\`,\s*\{\n\s*method:\s*'PUT',)/, "Topic updated");
addSuccessMsg(/(apiFetch\(\`\/topics\/\$\{id\}\`,\s*\{\n\s*method:\s*'DELETE')/, "$1,\n    successMessage: 'Topic deleted'");
addSuccessMsg(/(apiFetch\(\`\/subjects\`,\s*\{\n\s*method:\s*'POST',)/, "Subject added");
addSuccessMsg(/(apiFetch\(\`\/subjects\/\$\{id\}\`,\s*\{\n\s*method:\s*'PUT',)/, "Subject updated");
addSuccessMsg(/(apiFetch\(\`\/subjects\/\$\{id\}\`,\s*\{\n\s*method:\s*'DELETE')/, "$1,\n    successMessage: 'Subject deleted'");
addSuccessMsg(/(apiFetch\(\`\/subjects\/topics\`,\s*\{\n\s*method:\s*'POST',)/, "Topic linked");
addSuccessMsg(/(apiFetch\(\`\/subjects\/topics\/\$\{id\}\`,\s*\{\n\s*method:\s*'PUT',)/, "Topic link updated");
addSuccessMsg(/(apiFetch\(\`\/subjects\/topics\/\$\{id\}\`,\s*\{\n\s*method:\s*'DELETE')/, "$1,\n    successMessage: 'Topic unlinked'");
addSuccessMsg(/(apiFetch\(\`\/subjects\/checklists\`,\s*\{\n\s*method:\s*'POST',)/, "Checklist item added");
addSuccessMsg(/(apiFetch\(\`\/subjects\/checklists\/\$\{id\}\`,\s*\{\n\s*method:\s*'PUT',)/, "Checklist item updated");
addSuccessMsg(/(apiFetch\(\`\/subjects\/checklists\/\$\{id\}\`,\s*\{\n\s*method:\s*'DELETE')/, "$1,\n    successMessage: 'Checklist item deleted'");
addSuccessMsg(/(apiFetch\(\`\/countdowns\`,\s*\{\n\s*method:\s*'POST',)/, "Important date added");
addSuccessMsg(/(apiFetch\(\`\/countdowns\/\$\{id\}\`,\s*\{\n\s*method:\s*'PUT',)/, "Important date updated");
addSuccessMsg(/(apiFetch\(\`\/countdowns\/\$\{id\}\`,\s*\{\n\s*method:\s*'DELETE')/, "$1,\n    successMessage: 'Important date deleted'");

fs.writeFileSync('src/utils/api.js', apiCode);
console.log('Patched API successfully');
