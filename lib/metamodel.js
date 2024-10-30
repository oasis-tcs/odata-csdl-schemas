class ModelElement {
  #children = {};
  #parent;
  #targetingPaths = new Set();
  constructor(parent) {
    this.#parent = parent;
  }
  get csdlDocument() {
    return this.#parent.csdlDocument;
  }
  get children() {
    return this.#children;
  }
  get parent() {
    return this.#parent;
  }
  addChild(name, value) {
    this.children[name] = value;
    if (this[name] === undefined)
      Object.defineProperty(this, name, {
        get: () => this.children[name],
      });
  }
  /**
   * @return {Set} set of #Path objects targeting this model element
   */
  get targetingPaths() {
    return this.#targetingPaths;
  }
  evaluate(path, offset = 0) {
    let target = this;
    for (let i = offset; target && i < path.segments.length; i++)
      target = path.segments[i].evaluate(target);
    if (!target) throw new InvalidPathError(path);
    target.targetingPaths.add(path);
    return target;
  }
  fromJSON(json, defaultKind) {
    for (const member in json) {
      const m = member.match(/^(.*)@(.*?)\.(.*?)(#(.*?))?$/);
      if (m) {
        this[member] = new Annotation(
          m[1] ? new RelativePath(this, m[1], this).evaluate() : this,
          m[2],
          m[3],
          m[5],
        );
        this[member].fromJSON(json[member]);
      } else if (!member.startsWith("$")) {
        if (json[member] instanceof Array) {
          this.addChild(member, []);
          for (const item of json[member]) {
            const memberItem = new closure[item.$Kind](this);
            memberItem.fromJSON(item);
            this.children[member].push(memberItem);
          }
        } else {
          const kind =
            json[member].$Kind ||
            (typeof defaultKind === "function"
              ? defaultKind(json[member])
              : defaultKind);
          if (kind) new closure[kind](this, member);
          else this.addChild(member, new ModelElement(this));
          this.children[member].fromJSON(json[member]);
        }
      } else if (!this[member] && typeof json[member] !== "object")
        this[member] = json[member];
    }
  }
  toJSON() {
    return { ...this, ...this.children };
  }
}

class NamedModelElement extends ModelElement {
  #name;
  get name() {
    return this.#name;
  }
  constructor(parent, name) {
    super(parent);
    this.#name = name;
    parent.addChild(name, this);
  }
}

class NamedSubElement extends NamedModelElement {
  constructor(parent, sub, name) {
    super(parent, name);
    parent[sub] ||= {};
    parent[sub][name] = this;
  }
}

class CSDLDocument extends ModelElement {
  #paths = [];
  get csdlDocument() {
    return this;
  }
  get paths() {
    return this.#paths;
  }
  finish() {
    for (const path of this.paths) path.target;
    this.#paths = undefined;
  }
  fromJSON(json) {
    super.fromJSON(json, "Schema");
    for (const uri in json.$Reference)
      new Reference(this, uri).fromJSON(json.$Reference[uri]);
  }
}

class Segment {
  #path;
  #segment;
  #target;
  constructor(path, segment) {
    this.#path = path;
    this.#segment = segment;
  }
  get target() {
    if (!this.#target) this.#path.evaluate();
    return this.#target;
  }
  set target(target) {
    this.#target = target;
  }
  qualifiedName() {
    const i = this.#segment.lastIndexOf(".");
    return (
      i !== -1 && {
        namespace: this.#segment.substring(0, i),
        name: this.#segment.substring(i + 1),
      }
    );
  }
  evaluate(modelElement) {
    return (this.#target = modelElement.evaluateSegment(this.#segment));
  }
  toJSON() {
    return this.#segment;
  }
}

class AbstractPath extends ModelElement {
  #segments;
  constructor(host, path) {
    super(host);
    this.#segments = path
      .split("/")
      .map((segment) => new Segment(this, segment));
  }
  get target() {
    return this.#segments[this.#segments.length - 1].target;
  }
  get segments() {
    return this.#segments;
  }
  toJSON() {
    return this.segments.map((segment) => segment.toJSON()).join("/");
  }
}

class NamespacePath extends AbstractPath {
  constructor(host, path) {
    super(host, path);
    this.csdlDocument.paths?.unshift(this);
  }
  evaluate() {
    const { namespace, name } = this.segments[0].qualifiedName();
    if (namespace === "Edm") return this.segments[0];
    let target;
    for (const schema in this.csdlDocument.children)
      if (
        !schema.startsWith("$") &&
        (this.csdlDocument.children[schema].$Alias === namespace ||
          this.csdlDocument.children[schema].namespace === namespace)
      ) {
        target = this.csdlDocument.children[schema].children[name];
        if (target instanceof Array)
          target = target.some((t) => t.evaluate(this, 1));
        else target = target.evaluate(this, 1);
        break;
      }
    if (!target) throw new InvalidPathError(this);
    return (this.segments[0].target = target);
  }
}

class RelativePath extends AbstractPath {
  #relativeTo;
  constructor(host, path, relativeTo) {
    super(host, path);
    this.#relativeTo = relativeTo;
    this.csdlDocument.paths?.push(this);
  }
  evaluate() {
    const target = this.#relativeTo.evaluate(this);
    if (!target) throw new InvalidPathError(this);
    return target;
  }
}

class InvalidPathError extends Error {
  constructor(path) {
    super("Invalid path " + path.toJSON());
  }
}

class Reference extends ModelElement {
  #uri;
  constructor(csdlDocument, uri) {
    super(csdlDocument);
    csdlDocument.$Reference ||= {};
    csdlDocument.$Reference[uri] = this;
  }
  get uri() {
    return this.#uri;
  }
  fromJSON(json) {
    super.fromJSON(json);
    if (json.$Include)
      for (const include of json.$Include) new Include(this).fromJSON(include);
    if (json.$IncludeAnnotations)
      for (const include of json.$IncludeAnnotations)
        new IncludeAnnotations(this).fromJSON(include);
  }
}

class Include extends ModelElement {
  constructor(reference) {
    super(reference);
    if (!reference.$Include) reference.$Include = [];
    reference.$Include.push(this);
  }
}

class IncludeAnnotations extends ModelElement {
  constructor(reference) {
    super(reference);
    if (!reference.$IncludeAnnotations) reference.$IncludeAnnotations = [];
    reference.$IncludeAnnotations.push(this);
  }
}

class Namespaced extends ModelElement {
  #namespace;
  constructor(csdlDocument, namespace) {
    super(csdlDocument);
    this.#namespace = namespace;
  }
  #include() {
    for (const schema in this.csdlDocument.children)
      if (
        !schema.startsWith("$") &&
        (this.#namespace === this.csdlDocument.children[schema].$Alias ||
          this.#namespace === schema)
      )
        return { namespace: this.csdlDocument.children[schema].#namespace };
    for (const url in this.csdlDocument.$Reference) {
      if (this.csdlDocument.$Reference[url].$Include)
        for (const include of this.csdlDocument.$Reference[url].$Include)
          if (
            this.#namespace === include.$Alias ||
            this.#namespace === include.$Namespace
          )
            return { url, namespace: include.$Namespace };
    }
  }
  get namespace() {
    return this.#include().namespace;
  }
  get namespaceURL() {
    return this.#include().url;
  }
}

class Annotation extends Namespaced {
  #target;
  #term;
  #qualifier;
  #value;
  constructor(target, namespace, term, qualifier) {
    super(target, namespace);
    this.#target = target;
    this.#term = term;
    this.#qualifier = qualifier;
  }
  get value() {
    return this.#value;
  }
  set value(value) {
    this.#value = value;
  }
  evaluationStart() {
    return this.#target.evaluationStart();
  }
  fromJSON(json) {
    if (typeof json === "object") {
      dynamic: {
        for (const dynamicExpr in json)
          switch (dynamicExpr) {
            case "$Path":
              this.value = new Path(
                this,
                json[dynamicExpr],
                this.#target.evaluationStart(),
              );
              break dynamic;
          }
        this.value = new (json instanceof Array ? Collection : Record)(this);
      }
      this.value.fromJSON(json);
    } else this.value = json;
  }
  toJSON() {
    return this.value.toJSON?.() || this.value;
  }
}

class Schema extends Namespaced {
  constructor(csdlDocument, namespace) {
    super(csdlDocument, namespace);
    csdlDocument.addChild(namespace, this);
  }
  get schema() {
    return this;
  }
}

class Record extends ModelElement {
  fromJSON(json) {
    super.fromJSON(json, "PropertyValue");
  }
}

class Collection extends ModelElement {
  #value;
  get value() {
    return this.#value;
  }
  set value(value) {
    this.#value = value;
  }
  fromJSON(json) {
    const value = [];
    for (const item of json) {
      Annotation.prototype.fromJSON.call(this, item);
      value.push(this.value);
    }
    this.value = value;
  }
  toJSON() {
    return this.value.map((item) =>
      Annotation.prototype.toJSON.call(this, item),
    );
  }
}

class PropertyValue extends NamedModelElement {
  #value;
  get value() {
    return this.#value;
  }
  set value(value) {
    this.#value = value;
  }
  fromJSON(json) {
    Annotation.prototype.fromJSON.call(this, json);
  }
  toJSON(json) {
    return Annotation.prototype.toJSON.call(this, json);
  }
}

class Path extends ModelElement {
  constructor(host, path) {
    super(host);
    this.$Path = new RelativePath(this, path, host.evaluationStart());
  }
}

class ComplexType extends NamedModelElement {
  evaluateSegment(segment) {
    return (
      this.children[segment] || this.$BaseType.target.evaluateSegment(segment)
    );
  }
  effectiveType() {
    if (!this.$BaseType) return this;
    const props = { ...this.$BaseType.effectiveType };
    for (const prop in this.children)
      if (prop in props) {
        // TODO: Merge this.children[prop] into props[prop]
      } else props[prop] = this.children[prop];
    const effectiveType = new this.constructor(
      new ModelElement(this),
      this.name,
    );
    for (const prop in props) effectiveType.addChild(prop, props[prop]);
    return effectiveType;
  }
  fromJSON(json) {
    super.fromJSON(json, "Property");
    if (json.$BaseType)
      this.$BaseType = new NamespacePath(this, json.$BaseType);
  }
}

class EntityType extends ComplexType {
  effectiveType() {
    const effectiveType = super.effectiveType();
    if (effectiveType !== this)
      for (let t = this; t; t = t.$BaseType?.target)
        if (t.$Key) {
          effectiveType.$Key = t.$Key;
          break;
        }
    return effectiveType;
  }
  fromJSON(json) {
    super.fromJSON(json);
    if (json.$Key) {
      this.$Key = new Key(this);
      this.$Key.fromJSON(json.$Key);
    }
  }
}

class Key extends ModelElement {
  #entityType;
  #propertyRefs = [];
  constructor(entityType) {
    super(entityType);
    this.#entityType = entityType;
  }
  fromJSON(json) {
    // TODO: $Key annotations
    for (const prop of json) {
      let propRef;
      if (typeof prop === "string")
        propRef = new PropertyRef(
          this,
          prop,
          new RelativePath(this, prop, this.#entityType),
        );
      else
        for (const name in prop)
          propRef = new PropertyRef(
            this,
            name,
            new RelativePath(this, prop[name], this.#entityType),
            true,
          );
      this.#propertyRefs.push(propRef);
    }
  }
  toJSON() {
    return this.#propertyRefs;
  }
}

class PropertyRef extends NamedModelElement {
  #path;
  #alias;
  constructor(key, name, path, alias) {
    super(key, name);
    this.#path = path;
    this.#alias = alias;
  }
  get target() {
    return this.#path.target;
  }
  toJSON() {
    if (this.#alias) {
      const propRef = {};
      propRef[this.name] = this.#path;
      return propRef;
    } else return this.name;
  }
}

class Property extends NamedModelElement {
  evaluationStart() {
    return this.parent;
  }
  fromJSON(json) {
    super.fromJSON(json);
    this.$Type = new NamespacePath(this, json.$Type || "Edm.String");
  }
  toJSON() {
    const result = { ...this };
    if (this.$Type.evaluate().toJSON() === "Edm.String") delete result.$Type;
    return result;
  }
}

class NavigationProperty extends NamedModelElement {
  fromJSON(json) {
    super.fromJSON(json);
    this.$Type = new NamespacePath(this, json.$Type);
  }
}

class EntityContainer extends NamedModelElement {
  evaluateSegment(segment) {
    return this.children[segment];
  }
  fromJSON(json) {
    super.fromJSON(json, function (json) {
      if (json.$Type) return "EntitySetOrSingleton";
      if (json.$Function) return "FunctionImport";
      if (json.$Action) return "ActionImport";
    });
  }
}

class EntitySetOrSingleton extends NamedModelElement {
  evaluateSegment(segment) {
    return this.$Type.target.evaluateSegment(segment);
  }
  fromJSON(json) {
    super.fromJSON(json);
    this.$Type = new NamespacePath(this, json.$Type);
    for (const prop in json.$NavigationPropertyBinding)
      new NavigationPropertyBinding(this, prop).fromJSON(
        json.$NavigationPropertyBinding,
      );
  }
}

class NavigationPropertyBinding extends NamedSubElement {
  #path;
  constructor(entitySetOrSingleton, prop) {
    super(entitySetOrSingleton, "$NavigationPropertyBinding", prop);
  }
  get path() {
    return this.#path;
  }
  fromJSON(json) {
    // TODO: $NavigationPropertyBinding annotations
    this.#path = new RelativePath(this, json[this.name], this.parent.parent);
  }
  toJSON() {
    return this.path.toJSON();
  }
}

class Function extends ModelElement {}

class FunctionImport extends NamedModelElement {
  fromJSON(json) {
    this.$Function = new NamespacePath(this, json.$Function);
    if (json.$EntitySet)
      this.$EntitySet = new RelativePath(this, json.$EntitySet, this.parent);
    super.fromJSON(json);
  }
}

function CSDLReviver(key, value) {
  if (key === "") {
    const csdl = new CSDLDocument();
    csdl.fromJSON(value);
    csdl.finish();
    return csdl;
  } else return value;
}

const closure = (module.exports = {
  RelativePath,
  NamespacePath,
  CSDLDocument,
  Reference,
  Include,
  IncludeAnnotations,
  Schema,
  Annotation,
  Record,
  Collection,
  PropertyValue,
  ComplexType,
  EntityType,
  Key,
  PropertyRef,
  Property,
  NavigationProperty,
  EntityContainer,
  EntitySetOrSingleton,
  NavigationPropertyBinding,
  Function,
  FunctionImport,
  CSDLReviver,
});

debugger;
global.csdl = JSON.parse(
  require("fs").readFileSync(__dirname + "/../examples/csdl-16.1.json"),
  CSDLReviver,
);
