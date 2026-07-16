const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const frontendRoot = path.join(root, 'frontend', 'Facebook_Frontend');
const sourceRoot = path.join(frontendRoot, 'src');
const catalogPath = path.join(root, 'shared', 'contracts', 'localization-catalog.json');
const frontendRequire = createRequire(path.join(frontendRoot, 'package.json'));
const parser = frontendRequire('@babel/parser');
const traverse = frontendRequire('@babel/traverse').default;

const checkedAttributes = new Set(['title', 'placeholder', 'aria-label', 'alt']);
const checkedObjectKeys = new Set([
  'label', 'description', 'title', 'placeholder', 'message', 'detail',
  'confirmText', 'cancelText',
]);
const ignoredText = new Set(['Facebook', 'Reels', 'Messenger', 'Admin Panel', 's', 'MB', 'MB)']);
const ignoredControlValues = new Set([
  '2-digit', 'error', 'loading', 'prompt', 'posts', 'events', 'blocked',
]);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const keyBySource = new Map(catalog.entries.map((entry) => [normalize(entry.sourceText), entry.key]));
const newEntries = [];

function normalize(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isHumanText(value) {
  const text = normalize(value);
  if (!text || ignoredText.has(text) || ignoredControlValues.has(text)) return false;
  if (/^[a-z]{2}-[A-Z]{2}$/.test(text)) return false;
  if (!/[A-Za-zÀ-ỹ]/u.test(text)) return false;
  if (/^(https?:|\/|#|\.|[a-z]+:)[^\s]*$/i.test(text)) return false;
  return true;
}

function staticText(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((item) => item.value.cooked).join('');
  }
  return null;
}

function slug(value) {
  return normalize(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36) || 'text';
}

function keyFor(file, value) {
  const source = normalize(value);
  const existing = keyBySource.get(source);
  if (existing) return existing;

  const relative = path.relative(sourceRoot, file).replace(/\.[^.]+$/, '')
    .split(path.sep).map((part) => slug(part)).filter(Boolean).join('.');
  const hash = crypto.createHash('sha1').update(`${relative}:${source}`).digest('hex').slice(0, 8);
  const key = `ui.${relative}.${slug(source)}.${hash}`;
  const appearsEnglish = !/[À-ỹ]/u.test(source);
  newEntries.push({
    key,
    sourceText: source,
    context: `Auto-discovered UI text in ${path.relative(root, file).replaceAll('\\', '/')}`,
    translations: appearsEnglish ? { en: source } : {},
  });
  keyBySource.set(source, key);
  return key;
}

const files = [];
function collectFiles(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) collectFiles(fullPath);
    else if (/\.(jsx|tsx)$/.test(item.name)) files.push(fullPath);
  }
}

function nearestTopLevelFunction(nodePath) {
  let current = nodePath;
  let result = null;
  while (current && !current.isProgram()) {
    if (current.isFunction()) result = current;
    current = current.parentPath;
  }
  return result;
}

collectFiles(sourceRoot);
let changedFiles = 0;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'], errorRecovery: true });
  const edits = [];
  let needsImport = false;

  const isAlreadyTranslated = (nodePath) => {
    const call = nodePath.findParent((parent) => parent.isCallExpression());
    return call?.node.callee?.type === 'Identifier'
      && ['t', 'translateCatalogKey'].includes(call.node.callee.name);
  };

  const isDynamicUiContext = (nodePath) => {
    const attribute = nodePath.findParent((parent) => parent.isJSXAttribute());
    if (attribute) return checkedAttributes.has(attribute.node.name?.name);

    const expression = nodePath.findParent((parent) => parent.isJSXExpressionContainer());
    if (expression && !expression.parentPath.isJSXAttribute()) return true;

    const call = nodePath.findParent((parent) => parent.isCallExpression());
    if (!call) return false;
    const callee = call.node.callee;
    return (callee.type === 'MemberExpression' && callee.object?.name === 'toast')
      || (callee.type === 'Identifier' && ['getApiErrorMessage', 'setError'].includes(callee.name));
  };

  const addEdit = (nodePath, node, value, replacementFor) => {
    if (!isHumanText(value)) return;
    if (!nearestTopLevelFunction(nodePath)) return;
    const key = keyFor(file, value);
    edits.push({ start: node.start, end: node.end, text: replacementFor(key, node, value) });
    needsImport = true;
  };

  traverse(ast, {
    StringLiteral(nodePath) {
      if (isAlreadyTranslated(nodePath) || !isDynamicUiContext(nodePath)) return;
      addEdit(nodePath, nodePath.node, nodePath.node.value, (key) => `translateCatalogKey('${key}')`);
    },
    TemplateLiteral(nodePath) {
      if (nodePath.node.expressions.length === 0) return;
      if (isAlreadyTranslated(nodePath) || !isDynamicUiContext(nodePath)) return;
      let value = '';
      nodePath.node.quasis.forEach((quasi, index) => {
        value += quasi.value.cooked;
        if (index < nodePath.node.expressions.length) value += `{{value${index}}}`;
      });
      addEdit(nodePath, nodePath.node, value, (key) => {
        const variables = nodePath.node.expressions
          .map((expression, index) => `value${index}: ${source.slice(expression.start, expression.end)}`)
          .join(', ');
        return `translateCatalogKey('${key}', { ${variables} })`;
      });
    },
    JSXText(nodePath) {
      const value = nodePath.node.value;
      addEdit(nodePath, nodePath.node, value, (key) => {
        const leading = value.match(/^\s*/)?.[0] || '';
        const trailing = value.match(/\s*$/)?.[0] || '';
        return `${leading}{translateCatalogKey('${key}')}${trailing}`;
      });
    },
    JSXAttribute(nodePath) {
      const name = nodePath.node.name?.name;
      if (!checkedAttributes.has(name)) return;
      const valueNode = nodePath.node.value;
      const value = valueNode?.type === 'StringLiteral'
        ? valueNode.value
        : valueNode?.type === 'JSXExpressionContainer' ? staticText(valueNode.expression) : null;
      if (!value || !isHumanText(value)) return;
      const target = valueNode.type === 'JSXExpressionContainer' ? valueNode.expression : valueNode;
      addEdit(nodePath, target, value, (key) => `{translateCatalogKey('${key}')}`);
    },
    ObjectProperty(nodePath) {
      const keyName = nodePath.node.key?.name || nodePath.node.key?.value;
      if (!checkedObjectKeys.has(keyName)) return;
      const value = staticText(nodePath.node.value);
      if (value) addEdit(nodePath, nodePath.node.value, value, (key) => `translateCatalogKey('${key}')`);
    },
    CallExpression(nodePath) {
      const callee = nodePath.node.callee;
      if (callee.type === 'Identifier' && ['t', 'translateCatalogKey'].includes(callee.name)) return;
      const isToast = callee.type === 'MemberExpression' && callee.object?.name === 'toast';
      if (!isToast) return;
      const value = staticText(nodePath.node.arguments[0]);
      if (value) addEdit(nodePath, nodePath.node.arguments[0], value, (key) => `translateCatalogKey('${key}')`);
    },
  });

  if (!edits.length) continue;
  if (needsImport && !source.includes("shared/localizationRuntime")) {
    const lastImport = ast.program.body.filter((node) => node.type === 'ImportDeclaration').at(-1);
    const relativeImport = path.relative(path.dirname(file), path.join(sourceRoot, 'shared', 'localizationRuntime'))
      .replaceAll('\\', '/');
    const specifier = relativeImport.startsWith('.') ? relativeImport : `./${relativeImport}`;
    edits.push({
      start: lastImport?.end || 0,
      end: lastImport?.end || 0,
      text: `\nimport { translateCatalogKey } from '${specifier}';`,
    });
  }

  edits.sort((a, b) => b.start - a.start);
  let output = source;
  for (const edit of edits) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  fs.writeFileSync(file, output, 'utf8');
  changedFiles += 1;
}

if (newEntries.length) {
  const lines = newEntries.map((entry) => `    ${JSON.stringify(entry)}`);
  let source = fs.readFileSync(catalogPath, 'utf8');
  const insertion = source.lastIndexOf('\n  ]');
  const prefix = source.slice(0, insertion).trimEnd();
  source = `${prefix},\n${lines.join(',\n')}\n  ]${source.slice(insertion + 4)}`;
  fs.writeFileSync(catalogPath, source, 'utf8');
}

console.log(`Localized ${changedFiles} file(s); added ${newEntries.length} catalog entr${newEntries.length === 1 ? 'y' : 'ies'}.`);
