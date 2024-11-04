const csdlDocuments = new Map();

class ModelElement {
  #children = {};
  #parent;
  #targetingPaths = new Set();
  #targetingSegments = new Set();
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
  /**
   * @return {Set} set of #AbstractPath objects that target this model element
   */
  get targetingPaths() {
    return this.#targetingPaths;
  }
  /**
   * @return {Set} set of #Segment objects that are non-final in their path
   * and target this model element
   */
  get targetingSegments() {
    return this.#targetingSegments;
  }
  evaluate(path, offset = 0) {
    let target = this;
    for (let i = offset; i < path.segments.length; i++) {
      target = path.segments[i].evaluate(target);
      if (!target) throw new InvalidPathError(path);
      if (i < path.segments.length - 1)
        target.targetingSegments.add(path.segments[i]);
    }
    target.targetingPaths.add(path);
    return target;
  }
  fromJSON(json, defaultKind) {
    const annos = {};
    for (const member in json) {
      const m = member.match(/^(.*)@(.*?)(#(.*?))?$/);
      if (m) {
        const anno = new Annotation(
          m[1] ? new RelativePath(this, m[1], this).evaluate() : this,
          m[2],
          m[4],
        );
        anno.fromJSON(json[member]);
        if (m[1]) {
          annos[m[1]] ||= {};
          annos[m[1]][m[2] + (m[3] || "")] = anno;
        } else this[member] = anno;
      } else if (!member.startsWith("$")) {
        if (json[member] instanceof Array) {
          this.children[member] = [];
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
          else this.children[member] = new ModelElement(this);
          this.children[member].fromJSON(json[member]);
        }
      } else if (!this[member] && typeof json[member] !== "object")
        this[member] = json[member];
    }
    for (const member in annos)
      for (const a in annos[member]) {
        const target = this[member] || this.children[member];
        if (typeof target === "object") target["@" + a] = annos[member][a];
        else this[member + "@" + a] = annos[member][a];
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
  evaluateSegment(segment) {
    return this.children[segment];
  }
  constructor(parent, name) {
    super(parent);
    this.#name = name;
    parent.children[name] = this;
  }
}

class NamedSubElement extends NamedModelElement {
  constructor(parent, sub, name) {
    super(parent, name);
    parent[sub] ||= {};
    parent[sub][name] = this;
  }
}

class NamedValue extends NamedModelElement {
  #value;
  get value() {
    return this.#value;
  }
  static toJSONWithAnnotations(modelElement, json) {
    for (const member in modelElement.children)
      for (const anno in modelElement.children[member])
        if (anno.startsWith("@"))
          json[member + anno] = modelElement.children[member][anno];
    return json;
  }
  fromJSON(json) {
    this.#value = json;
  }
  toJSON() {
    return this.value;
  }
}

class CSDLDocument extends ModelElement {
  #uri;
  #paths = [];
  #finish;
  constructor(uri) {
    super();
    this.#uri = uri || "";
  }
  get csdlDocument() {
    return this;
  }
  get paths() {
    return this.#paths;
  }
  byQualifiedName(namespace, name) {
    let target;
    for (const schema in this.children)
      if (
        !schema.startsWith("$") &&
        [this.children[schema].$Alias, this.children[schema].name].includes(
          namespace,
        )
      ) {
        target = this.children[schema].children[name];
        break;
      }
    if (!target)
      reference: {
        for (const uri in this.$Reference)
          for (const include of this.$Reference[uri].$Include)
            if ([include.$Alias, include.$Namespace].includes(namespace)) {
              target = include.schema.children[name];
              if (target) break reference;
            }
      }
    return target;
  }
  /** Await this before addressing #AbstractPath.target, #ModelElement.targetingPaths
   * or #ModelElement.targetingSegments
   */
  finish() {
    if (!this.#finish) {
      let finished;
      this.#finish = new Promise(function (resolve, reject) {
        finished = resolve;
      });
      const references = [];
      for (const uri in this.$Reference)
        references.push(this.$Reference[uri].resolve());
      Promise.all(references).then(
        async function (uris) {
          for (const path of this.paths) path.target;
          this.#paths = undefined;
          await Promise.all(
            uris
              .filter((uri) => uri > this.#uri)
              .map((uri) =>
                csdlDocuments.get(uri).then((csdl) => csdl.finish()),
              ),
          );
          finished();
        }.bind(this),
      );
    }
    return this.#finish;
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
    if (!modelElement.evaluateSegment) throw new InvalidPathError(this.#path);
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
    if (["Edm", "odata"].includes(namespace)) return this.segments[0];
    let target = this.csdlDocument.byQualifiedName(namespace, name);
    if (!target) throw new InvalidPathError(this);
    // TODO: Address operation overloads
    if (target instanceof Array)
      target = target.some((t) => t.evaluate(this, 1));
    else target = target.evaluate(this, 1);
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
    this.#uri = uri;
    csdlDocument.$Reference ||= {};
    csdlDocument.$Reference[uri] = this;
  }
  get uri() {
    return this.#uri;
  }
  async resolve() {
    let csdl = csdlDocuments.get(this.uri);
    if (!csdl)
      csdlDocuments.set(
        this.uri,
        (csdl = new Promise(
          async function (resolve, reject) {
            const csdl = new CSDLDocument(this.uri);
            csdl.fromJSON(await (await fetch(this.uri)).json());
            resolve(csdl);
          }.bind(this),
        )),
      );
    csdl = await csdl;
    if (this.$Include)
      for (const include of this.$Include)
        include.schema = csdl.children[include.$Namespace];
    return this.uri;
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

class ListedModelElement extends ModelElement {
  constructor(parent, list) {
    super(parent);
    parent[list] ||= [];
    parent[list].push(this);
  }
}

class Include extends ListedModelElement {
  #schema;
  get schema() {
    return this.#schema;
  }
  set schema(schema) {
    this.#schema = schema;
  }
  constructor(reference) {
    super(reference, "$Include");
  }
}

class IncludeAnnotations extends ListedModelElement {
  constructor(reference) {
    super(reference, "$IncludeAnnotations");
  }
}

class Annotation extends ModelElement {
  #term;
  #qualifier;
  #value;
  constructor(target, term, qualifier) {
    super(target);
    this.#term = new NamespacePath(this, term);
    this.#qualifier = qualifier;
  }
  get term() {
    return this.#term;
  }
  get value() {
    return this.#value;
  }
  set value(value) {
    this.#value = value;
  }
  evaluationStart() {
    return this.parent.evaluationStart();
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
                this.parent.evaluationStart(),
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

class Schema extends NamedModelElement {}

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
      super.evaluateSegment(segment) ||
      this.$BaseType.target.evaluateSegment(segment)
    );
  }
  /**
   * @return {ComplexType} structured type containing also the inherited properties
   */
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
    for (const prop in props) effectiveType.children[prop] = props[prop];
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

class TypedModelElement extends NamedModelElement {
  evaluateSegment(segment) {
    return this.$Type.target.evaluateSegment(segment);
  }
  fromJSON(json) {
    this.$Type = new NamespacePath(this, json.$Type);
    super.fromJSON(json);
  }
}

class AbstractProperty extends TypedModelElement {
  evaluationStart() {
    return this.parent;
  }
}

class Property extends AbstractProperty {
  fromJSON(json) {
    if (!json.$Type) json = { ...json, $Type: "Edm.String" };
    super.fromJSON(json);
  }
  toJSON() {
    const json = { ...this };
    if (this.$Type.evaluate().toJSON() === "Edm.String") delete json.$Type;
    return json;
  }
}

class NavigationProperty extends AbstractProperty {}

class EntityContainer extends NamedModelElement {
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
    this.$Type = new NamespacePath(this, json.$Type);
    super.fromJSON(json);
    for (const prop in json.$NavigationPropertyBinding)
      new NavigationPropertyBinding(this, prop).fromJSON(
        json.$NavigationPropertyBinding,
      );
  }
}

class NavigationPropertyBinding extends NamedSubElement {
  #navigationProperty;
  #entitySet;
  constructor(entitySetOrSingleton, prop) {
    super(entitySetOrSingleton, "$NavigationPropertyBinding", prop);
  }
  get navigationProperty() {
    return this.#navigationProperty;
  }
  get entitySet() {
    return this.#entitySet;
  }
  fromJSON(json) {
    this.#navigationProperty = new RelativePath(
      this,
      this.name,
      this.parent.$Type.target,
    );
    this.#entitySet = new RelativePath(
      this,
      json[this.name],
      this.parent.parent,
    );
  }
  toJSON() {
    return this.entitySet.toJSON();
  }
}

class Operation extends ModelElement {
  fromJSON(json) {
    if (json.$Parameter) {
      for (const param of json.$Parameter) new Parameter(this).fromJSON(param);
    }
    if (json.$ReturnType) {
      this.$ReturnType = new ReturnType(this);
      this.$ReturnType.fromJSON(json.$ReturnType);
    }
    super.fromJSON(json);
  }
}

class Parameter extends ListedModelElement {
  constructor(operation) {
    super(operation, "$Parameter");
  }
  fromJSON(json) {
    this.$Type = new NamespacePath(this, json.$Type);
    super.fromJSON(json);
  }
}

class ReturnType extends ModelElement {
  fromJSON(json) {
    this.$Type = new NamespacePath(this, json.$Type);
    super.fromJSON(json);
  }
}

class Function extends Operation {}

class FunctionImport extends NamedModelElement {
  fromJSON(json) {
    this.$Function = new NamespacePath(this, json.$Function);
    if (json.$EntitySet)
      this.$EntitySet = new RelativePath(this, json.$EntitySet, this.parent);
    super.fromJSON(json);
  }
}

class TypeDefinition extends NamedModelElement {}

class EnumType extends NamedModelElement {
  fromJSON(json) {
    super.fromJSON(json, "Member");
  }
  toJSON() {
    return NamedValue.toJSONWithAnnotations(this, super.toJSON());
  }
}

class Member extends NamedValue {}

class Term extends Property {}

function CSDLReviver(key, value) {
  if (key === "") {
    const csdl = new CSDLDocument();
    csdl.fromJSON(value);
    csdl.finish();
    return csdl;
  } else return value;
}

const closure = (module.exports = {
  InvalidPathError,
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
  TypeDefinition,
  EnumType,
  Member,
  Term,
  CSDLReviver,
});

debugger;
global.csdl = JSON.parse(
  require("fs").readFileSync(__dirname + "/../examples/csdl-16.1.json"),
  CSDLReviver,
);
