const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const frontendRoot = path.join(root, 'frontend', 'Facebook_Frontend');
const frontendRequire = createRequire(path.join(frontendRoot, 'package.json'));
const parser = frontendRequire('@babel/parser');
const traverse = frontendRequire('@babel/traverse').default;
const sourceRoot = path.join(frontendRoot, 'src');
const catalogPath = path.join(root, 'shared', 'contracts', 'localization-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const catalogKeys = new Set(catalog.entries.map((entry) => entry.key));

const translatedCallNames = new Set(['t', 'translateCatalogKey']);
const checkedAttributes = new Set(['title', 'placeholder', 'aria-label', 'alt']);
const checkedObjectKeys = new Set([
  'label', 'description', 'title', 'placeholder', 'message', 'detail',
  'confirmText', 'cancelText',
]);
const ignoredText = new Set(['Facebook', 'Reels', 'Messenger', 'Admin Panel', 'HTTP', 'LIVE', 's', 'MB', 'MB)', 'MB · chunk']);
const ignoredControlValues = new Set([
  '2-digit', 'error', 'loading', 'prompt', 'posts', 'events', 'blocked',
]);

const files = [];
const collectFiles = (directory) => {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) collectFiles(fullPath);
    else if (/\.(jsx|tsx)$/.test(item.name)) files.push(fullPath);
  }
};

const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const isHumanText = (value) => {
  const text = normalize(value);
  if (!text || ignoredText.has(text) || ignoredControlValues.has(text)) return false;
  if (/^[a-z]{2}-[A-Z]{2}$/.test(text)) return false;
  if (!/[A-Za-zÀ-ỹ]/u.test(text)) return false;
  if (/^(https?:|\/|#|\.|[a-z]+:)[^\s]*$/i.test(text)) return false;
  return true;
};

const violations = [];
const report = (file, node, kind, value) => {
  violations.push({
    file: path.relative(root, file),
    line: node.loc?.start.line || 1,
    kind,
    value: normalize(value).slice(0, 120),
  });
};

const staticText = (node) => {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((item) => item.value.cooked).join('');
  }
  return null;
};

collectFiles(sourceRoot);

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = parser.parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });

  traverse(ast, {
    StringLiteral(nodePath) {
      const call = nodePath.findParent((parent) => parent.isCallExpression());
      if (call?.node.callee?.type === 'Identifier' && translatedCallNames.has(call.node.callee.name)) return;
      const attribute = nodePath.findParent((parent) => parent.isJSXAttribute());
      const expression = nodePath.findParent((parent) => parent.isJSXExpressionContainer());
      const isCheckedAttribute = attribute && checkedAttributes.has(attribute.node.name?.name);
      const isRenderedExpression = !attribute && expression?.node.expression === nodePath.node;
      const callee = call?.node.callee;
      if (callee?.type === 'MemberExpression' && callee.object?.name === 'toast') return;
      const isUiCall = (callee?.type === 'MemberExpression' && callee.object?.name === 'toast')
        || (callee?.type === 'Identifier' && ['getApiErrorMessage', 'setError'].includes(callee.name));
      const isFirstUiArgument = isUiCall && call.node.arguments[0] === nodePath.node;
      if ((!isCheckedAttribute && (isRenderedExpression || isFirstUiArgument)) && isHumanText(nodePath.node.value)) {
        report(file, nodePath.node, 'dynamic-string', nodePath.node.value);
      }
    },
    JSXText(nodePath) {
      if (isHumanText(nodePath.node.value)) {
        report(file, nodePath.node, 'jsx-text', nodePath.node.value);
      }
    },
    JSXAttribute(nodePath) {
      const name = nodePath.node.name?.name;
      if (!checkedAttributes.has(name)) return;
      const valueNode = nodePath.node.value;
      const value = valueNode?.type === 'StringLiteral'
        ? valueNode.value
        : valueNode?.type === 'JSXExpressionContainer'
          ? staticText(valueNode.expression)
          : null;
      if (value && isHumanText(value)) report(file, nodePath.node, `attribute:${name}`, value);
    },
    ObjectProperty(nodePath) {
      const key = nodePath.node.key?.name || nodePath.node.key?.value;
      if (!checkedObjectKeys.has(key)) return;
      const value = staticText(nodePath.node.value);
      if (value && isHumanText(value)) report(file, nodePath.node, `object:${key}`, value);
    },
    CallExpression(nodePath) {
      const callee = nodePath.node.callee;
      if (callee.type === 'Identifier' && translatedCallNames.has(callee.name)) {
        const keyNode = nodePath.node.arguments[0];
        if (keyNode?.type === 'StringLiteral' && !catalogKeys.has(keyNode.value)) {
          report(file, keyNode, 'missing-catalog-key', keyNode.value);
        }
        return;
      }
      const isToast = callee.type === 'MemberExpression'
        && callee.object?.name === 'toast';
      if (!isToast) return;
      const value = staticText(nodePath.node.arguments[0]);
      if (value && isHumanText(value)) report(file, nodePath.node, 'toast', value);
    },
  });
}

violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const item of violations) {
  console.log(`${item.file}:${item.line} [${item.kind}] ${item.value}`);
}

if (violations.length > 0) {
  console.error(`\nFound ${violations.length} hard-coded UI localization violation(s).`);
  process.exitCode = 1;
} else {
  console.log(`Localization check passed for ${files.length} JSX/TSX files.`);
}
