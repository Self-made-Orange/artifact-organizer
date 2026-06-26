/**
 * Validate an Artifact Organizer envelope document against catalog.json.
 * Returns array of error objects: [{ path, message }]. Empty array = valid.
 *
 * Use `normalizeEnvelope(doc)` first to convert legacy `hyperscribe/X` and
 * `outprint/X` component prefixes and their catalog versions to the current
 * `artifact-organizer/*` form. The renderer does this automatically; only call
 * it explicitly if you're using validate() standalone with legacy envelopes.
 */

// Every prefix an older release shipped. Listed longest-first so matching is
// unambiguous. Add new historical names here — never remove one (that breaks
// backward-compat with envelopes already saved to disk).
const LEGACY_COMPONENT_PREFIXES = ["hyperscribe/", "outprint/"];
const CURRENT_COMPONENT_PREFIX  = "artifact-organizer/";
const LEGACY_CATALOG_VERSIONS   = ["hyperscribe/v1", "outprint/v1"];
const CURRENT_CATALOG_VERSION   = "artifact-organizer/v1";

/**
 * Translate legacy `hyperscribe/X` / `outprint/X` envelopes to the current
 * `artifact-organizer/X` form without mutating the input. Walks `parts[]`
 * (page mode) and `featured` / `history[].content` (canvas mode).
 */
export function normalizeEnvelope(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const out = { ...doc };
  if (LEGACY_CATALOG_VERSIONS.includes(out.catalog)) {
    out.catalog = CURRENT_CATALOG_VERSION;
  }
  if (Array.isArray(out.parts)) {
    out.parts = out.parts.map(normalizeNode);
  }
  if (out.featured !== undefined) {
    out.featured = normalizeNode(out.featured);
  }
  if (Array.isArray(out.history)) {
    out.history = out.history.map(item =>
      item && typeof item === "object" && item.content !== undefined
        ? { ...item, content: normalizeContent(item.content) }
        : item
    );
  }
  return out;
}

function normalizeContent(content) {
  // history[].content can be a single node or an array of nodes
  if (Array.isArray(content)) return content.map(normalizeNode);
  return normalizeNode(content);
}

function normalizeNode(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return node;
  const out = { ...node };
  if (typeof out.component === "string") {
    for (const prefix of LEGACY_COMPONENT_PREFIXES) {
      if (out.component.startsWith(prefix)) {
        out.component = CURRENT_COMPONENT_PREFIX + out.component.slice(prefix.length);
        break;
      }
    }
  }
  if (Array.isArray(out.children)) {
    out.children = out.children.map(normalizeNode);
  }
  return out;
}

export function validate(doc, catalog) {
  const errors = [];

  if (!doc || typeof doc !== "object") {
    errors.push({ path: "", message: "Document must be an object" });
    return errors;
  }

  for (const field of catalog.envelope.required) {
    if (!(field in doc)) {
      errors.push({ path: field, message: `Envelope missing required field: ${field}` });
    }
  }

  if (doc.catalog && doc.catalog !== catalog.version) {
    errors.push({
      path: "catalog",
      message: `Unknown catalog: expected ${catalog.version}, got ${doc.catalog}`
    });
  }

  if (doc.parts !== undefined && !Array.isArray(doc.parts)) {
    errors.push({ path: "parts", message: "parts must be an array" });
  } else if (Array.isArray(doc.parts)) {
    if (doc.parts.length === 0) {
      errors.push({ path: "parts", message: "parts must contain at least one component" });
    } else {
      const root = doc.parts[0];
      const rootIsKnown =
        root && typeof root.component === "string" && catalog.components[root.component];
      if (rootIsKnown && root.component !== catalog.envelope.root_component) {
        errors.push({
          path: "parts[0]",
          message: `Root must be ${catalog.envelope.root_component}`
        });
      }
      doc.parts.forEach((node, i) => {
        validateNode(node, `parts[${i}]`, catalog, errors);
      });
    }
  }

  return errors;
}

function validateNode(node, path, catalog, errors) {
  if (!node || typeof node !== "object") {
    errors.push({ path, message: "Node must be an object" });
    return;
  }
  if (typeof node.component !== "string") {
    errors.push({ path: `${path}.component`, message: "component must be a string" });
    return;
  }

  const schema = catalog.components[node.component];
  if (!schema) {
    errors.push({ path, message: `Unknown component: ${node.component}` });
    return;
  }

  const props = node.props || {};
  for (const [propName, propSchema] of Object.entries(schema.props)) {
    const present = propName in props;
    if (propSchema.required && !present) {
      errors.push({
        path: `${path}.props.${propName}`,
        message: `Missing required prop: ${propName}`
      });
      continue;
    }
    if (present) {
      validateProp(
        props[propName],
        propSchema,
        `${path}.props.${propName}`,
        propName,
        errors
      );
    }
  }

  const unknownProps = Object.keys(props).filter(k => !(k in schema.props));
  for (const k of unknownProps) {
    errors.push({ path: `${path}.props.${k}`, message: `Unknown prop: ${k}` });
  }

  if (schema.children === "required" && !Array.isArray(node.children)) {
    errors.push({ path: `${path}.children`, message: `${node.component} requires children` });
  }
  if (schema.children === "forbidden" && node.children !== undefined) {
    errors.push({ path: `${path}.children`, message: `${node.component} must not have children` });
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child, i) => {
      validateNode(child, `${path}.children[${i}]`, catalog, errors);
    });
  }
}

function validateProp(value, schema, path, name, errors) {
  const actualType =
    value === null ? "null" :
    Array.isArray(value) ? "array" :
    typeof value;
  const expectedType = schema.type;

  if (expectedType === "array") {
    if (actualType !== "array") {
      errors.push({ path, message: `Prop ${name}: expected array, got ${actualType}` });
      return;
    }
    if (schema.items) {
      value.forEach((item, i) =>
        validateProp(item, schema.items, `${path}[${i}]`, `${name}[${i}]`, errors)
      );
    }
    return;
  }

  if (expectedType === "object") {
    if (actualType !== "object" || value === null) {
      errors.push({ path, message: `Prop ${name}: expected object, got ${actualType}` });
      return;
    }
    if (schema.props) {
      for (const [k, v] of Object.entries(schema.props)) {
        const has = k in value;
        if (v.required && !has) {
          errors.push({ path: `${path}.${k}`, message: `Missing required prop: ${k}` });
        }
        if (has) validateProp(value[k], v, `${path}.${k}`, `${name}.${k}`, errors);
      }
    }
    return;
  }

  if (actualType !== expectedType) {
    errors.push({
      path,
      message: `Prop ${name}: expected ${expectedType}, got ${actualType}`
    });
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      path,
      message: `Prop ${name}: value ${JSON.stringify(value)} not in enum: ${schema.enum.join(", ")}`
    });
  }

  if (schema.pattern && typeof value === "string") {
    if (!new RegExp(schema.pattern).test(value)) {
      errors.push({
        path,
        message: `Prop ${name}: value does not match pattern ${schema.pattern}`
      });
    }
  }
}
