class ModelElement {
  #parent;
  get parent() {
    return this.#parent;
  }

  #children = {};
  get children() {
    return this.#children;
  }

  constructor(parent) {
    this.#parent = parent;
  }

  descendantOf(anc) {
    return this.parent === anc || this.parent?.descendantOf?.(anc);
  }

  path() {
    return (
      (this.parent instanceof Schema
        ? this.parent.path() + "."
        : this.parent
          ? this.parent.path() + "/"
          : "") + this.toString()
    );
  }
  toString() {
    return this.constructor.name;
  }

  fromJSON(json, defaultKind) {
    let hasAnnotations = false;
    for (const member in json)
      if (!this[member]) {
        if (this.annotationFromJSON(json, member, json[member]))
          hasAnnotations = true;
        else if (!member.startsWith("$")) {
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
            if (kind) new closure[kind](this, member).fromJSON(json[member]);
          }
        } else if (typeof json[member] !== "object")
          this[member] = json[member];
      }

    if (hasAnnotations) this.csdlDocument.annotationTargets.push(this);
  }

  get csdlDocument() {
    return this.parent.csdlDocument;
  }

  toJSON() {
    const json = { ...this, ...this.children };

    this.annotationsOfAnnotations(json, "");

    return json;
  }

  toJSONWithAnnotations(sub, json) {
    for (const member in this[sub])
      for (const anno in this[sub][member])
        if (anno.startsWith("@")) {
          json[sub] ||= {};
          json[sub][member + anno] = this[sub][member][anno];

          this[sub][member][anno].annotationsOfAnnotations(
            json[sub],
            member + anno,
          );
        }
    return json;
  }

  dynamicExprFromJSON(json) {
    if (typeof json === "object") {
      let value;
      dynamic: {
        for (const dynamicExpr in json)
          switch (dynamicExpr) {
            case "$Path":
              value = new Path(this, json[dynamicExpr]);
              break dynamic;

            case "$And":
            case "$Or":
              value = new closure[dynamicExpr.substring(1)](this).fromJSON(
                json[dynamicExpr],
              );
              break dynamic;
          }

        value = new (json instanceof Array ? Collection : Record)(this);
      }
      value.fromJSON(json);
      return value;
    } else return json;
  }

  #annotations = {};
  get annotations() {
    return this.#annotations;
  }

  finishAnnotations() {
    this.#annotations = undefined;
  }
  annotationFromJSON(json, member, value) {
    const m = member.match(/^([^@]*)(@.*)?@([^@]*?)(#([^@]*?))?$/);
    if (m) {
      const path = m[1] || "";
      const anno = new Annotation(
        this,
        new RelativePath(this, path, this, "target"),
        m[3],
        m[5],
      );
      anno.fromJSON(value);
      this.annotations[path] ||= {};
      this.annotations[path][`${m[2] || ""}@${m[3]}${m[5] ? "#" + m[5] : ""}`] =
        anno;
      return true;
    } else return false;
  }

  nestAnnotations(annos, member, anno) {
    const termcast = member.replace(
      /(?<=@).*?(?=#|$)/,

      function (m) {
        return this.csdlDocument.unalias(m);
      }.bind(this),
    );
    this[termcast] = anno;
    for (const mem in annos) {
      const m = mem.replace(
        /(?<=@).*?(?=#|@|$)/g,

        function (m) {
          return this.csdlDocument.unalias(m);
        }.bind(this),
      );
      if (m.startsWith(termcast + "@"))
        this[termcast].nestAnnotations(
          annos,
          m.substring(termcast.length),
          annos[mem],
        );
    }
  }

  annotationsOfAnnotations(json, prefix) {
    for (const member in this)
      if (member.startsWith("@")) {
        this[member].annotationsOfAnnotations(json, prefix + member);
        if (prefix) json[prefix + member] = this[member];
      }
  }

  evaluateSegment(segment) {
    return this.children[segment.segment];
  }

  get host() {
    return this.annotation?.host || this;
  }

  evaluationStart(anno) {
    return this;
  }

  #targetingPaths = new Set();
  get targetingPaths() {
    return this.#targetingPaths;
  }

  #targetingSegments = new Set();
  get targetingSegments() {
    return this.#targetingSegments;
  }

  isAnnotation(callback) {
    for (const p of this.targetingPaths)
      if (p.attribute === "$Path") {
        const anno = p.parent.annotation;
        if (anno && callback(anno)) return true;
      }
  }
}

class CSDLDocument extends ModelElement {
  get csdlDocument() {
    return this;
  }

  fromJSON(json) {
    if (json.$EntityContainer)
      this.$EntityContainer = new QualifiedNamePath(
        this,
        json.$EntityContainer,
        "$EntityContainer",
      );

    for (const uri in json.$Reference)
      new Reference(this, uri).fromJSON(json.$Reference[uri]);

    super.fromJSON(json, "Schema");
  }

  #findSchema(namespace, callback) {
    let result;
    for (const schema in this.children)
      if ([this.children[schema].$Alias, schema].includes(namespace))
        result = callback(this.children[schema]);
    if (!result)
      reference: {
        for (const uri in this.$Reference)
          for (const include of this.$Reference[uri].$Include)
            if ([include.$Alias, include.$Namespace].includes(namespace))
              result = callback(include.schema);
        if (result) break reference;
      }
    return result;
  }
  byQualifiedName(namespace, name) {
    return this.#findSchema(namespace, (schema) => schema.children[name]);
  }

  #annotationTargets = [];
  get annotationTargets() {
    return this.#annotationTargets;
  }

  get(path) {
    return new RelativePath(this, path, this).evaluate();
  }

  #uri;
  #finish;

  #finished;
  get finished() {
    return this.#finished;
  }

  #schemas;
  get schemas() {
    return this.#schemas;
  }

  constructor(uri, schemas) {
    super();
    this.#uri = uri || "";
    this.#schemas = schemas;
  }
  finish() {
    if (!this.#finish) {
      this.#schemas ||= new CSDLDocument();
      Object.assign(this.schemas.children, this.children);

      let finished;
      this.#finish = new Promise(function (resolve, reject) {
        finished = resolve;
      });

      const references = [];
      for (const uri in this.$Reference)
        references.push(this.$Reference[uri].resolve());
      Promise.all(references).then(
        async function (uris) {
          for (const target of this.annotationTargets) {
            for (const path in target.annotations) {
              const t = path ? target.children[path] : target;
              for (const member in target.annotations[path])
                if (!/@.*@/.test(member))
                  t.nestAnnotations(
                    target.annotations[path],
                    member,
                    target.annotations[path][member],
                  );
            }
            target.finishAnnotations();
          }
          this.#annotationTargets = undefined;

          for (const path of this.paths) path.evaluate();
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
      this.#finished = true;
    }
    return this.#finish;
  }

  #paths = [];
  get paths() {
    return this.#paths;
  }

  unalias(qname) {
    const i = qname.lastIndexOf(".");
    const namespace = qname.substring(0, i);
    const name = qname.substring(i + 1);
    return this.#findSchema(namespace, (schema) => schema.name) + "." + name;
  }

  toString() {
    return "";
  }
}

function CSDLReviver(key, value) {
  if (key === "") {
    const csdlDocument = new CSDLDocument();
    csdlDocument.fromJSON(value);
    return csdlDocument;
  } else return value;
}

class Reference extends ModelElement {
  #uri;
  get uri() {
    return this.#uri;
  }

  constructor(csdlDocument, uri) {
    super(csdlDocument);
    this.#uri = uri;
    csdlDocument.$Reference ||= {};
    csdlDocument.$Reference[uri] = this;
  }
  toString() {
    return "$Reference<" + this.uri + ">";
  }
  fromJSON(json) {
    if (json.$Include)
      for (const include of json.$Include) new Include(this).fromJSON(include);

    if (json.$IncludeAnnotations)
      for (const include of json.$IncludeAnnotations)
        new IncludeAnnotations(this).fromJSON(include);

    super.fromJSON(json);
  }

  async resolve() {
    let csdl = csdlDocuments.get(this.uri);
    if (!csdl)
      csdlDocuments.set(
        this.uri,
        (csdl = new Promise(
          async function (resolve, reject) {
            const csdl = new CSDLDocument(this.uri, this.csdlDocument.schemas);
            csdl.fromJSON(await (await fetch(this.uri)).json());
            resolve(csdl);
          }.bind(this),
        )),
      );
    csdl = await csdl;
    if (this.$Include)
      for (const include of this.$Include)
        include.schema = csdl.children[include.$Namespace];
    if (this.$IncludeAnnotations)
      for (const include of this.$IncludeAnnotations)
        include.schema = csdl.children[include.$TermNamespace];
    return this.uri;
  }
}

class ListedModelElement extends ModelElement {
  #list;
  #index;
  constructor(parent, list) {
    super(parent);
    parent[list] ||= [];
    parent[list].push(this);
    this.#list = list;
    this.#index = parent[list].length - 1;
  }
  toString() {
    return this.#list + "/" + this.#index;
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

class NamedModelElement extends ModelElement {
  #name;
  get name() {
    return this.#name;
  }

  constructor(parent, name) {
    super(parent);
    this.#name = name;
    parent.children[name] = this;
    this.$Kind = this.constructor.name;
  }
  toString() {
    return this.name;
  }
}
class Schema extends NamedModelElement {
  constructor(csdlDocument, name) {
    super(csdlDocument, name);
    delete this.$Kind;
  }
}

class AbstractPath extends ModelElement {
  #segments;
  get segments() {
    return this.#segments;
  }

  set segments(segments) {
    this.#segments = segments;
  }

  #attribute;
  get attribute() {
    return this.#attribute;
  }

  constructor(host, attribute) {
    super(host);
    this.#attribute = attribute;
  }
  toString() {
    return this.attribute || super.toString();
  }
  toJSON() {
    return this.segments.map((segment) => segment.toJSON()).join("/");
  }

  get target() {
    return this.segments[this.segments.length - 1].target;
  }

  evaluateSegment(segment) {
    return this.target.evaluateSegment(segment);
  }
}
class QualifiedNamePath extends AbstractPath {
  constructor(host, qname, attribute) {
    super(host, attribute);
    this.segments = [new QualifiedNameSegment(this, qname)];

    this.csdlDocument.paths?.push(this);
  }
  evaluate() {
    const target = this.segments[0].evaluateRelativeTo();

    if (this.csdlDocument.paths) target.targetingPaths?.add(this);

    return target;
  }
}

class Segment {
  #target;

  #path;
  get path() {
    return this.#path;
  }

  #segment;
  get segment() {
    return this.#segment;
  }

  constructor(path, segment) {
    this.#path = path;
    this.#segment = segment;
  }
  get target() {
    if (!this.#target) {
      if (!this.path.csdlDocument.finished) return "CSDL document not finished";

      this.path.evaluate();
    }
    return this.#target;
  }
  set target(target) {
    this.#target = target;
  }
  toJSON() {
    return this.#segment;
  }
}
class QualifiedNameSegment extends Segment {
  #namespace;
  #name;
  constructor(path, segment) {
    super(path, segment);

    const i = segment.lastIndexOf(".");
    this.#namespace = segment.substring(0, i);
    this.#name = segment.substring(i + 1);
  }
  evaluateRelativeTo(modelElement) {
    if (["Edm", "odata", "System", "Transient"].includes(this.#namespace))
      return this;
    return (this.target = this.path.csdlDocument.byQualifiedName(
      this.#namespace,
      this.#name,
    ));
  }
}

class ComplexType extends NamedModelElement {
  #effectiveType;
  get effectiveType() {
    return (this.#effectiveType ||= this.computeEffectiveType());
  }
  computeEffectiveType() {
    if (!this.$BaseType) return this;
    const effectiveType = new this.constructor(
      new ModelElement(),
      this.name + "<effective>",
    );
    for (const prop in this.$BaseType.target.effectiveType.children)
      effectiveType.children[prop] =
        this.$BaseType.target.effectiveType.children[prop];
    for (const prop in this.children)
      if (prop in effectiveType.children) {
        effectiveType.children[prop] = new this.children[prop].constructor(
          effectiveType,
          prop,
        );
        Object.assign(
          effectiveType.children[prop],
          this.$BaseType.target.effectiveType.children[prop],
          this.children[prop],
        );
      } else effectiveType.children[prop] = this.children[prop];
    return effectiveType;
  }
  fromJSON(json) {
    if (json.$BaseType)
      this.$BaseType = new QualifiedNamePath(this, json.$BaseType, "$BaseType");

    super.fromJSON(json, "Property");
  }

  evaluateSegment(segment) {
    return this.effectiveType.children[segment.segment];
  }
}
class EntityType extends ComplexType {
  computeEffectiveType() {
    const effectiveType = super.computeEffectiveType();
    if (effectiveType !== this)
      for (let t = this; t; t = t.$BaseType?.target)
        if (t.$Key) {
          effectiveType.$Key = t.$Key;
          break;
        }
    return effectiveType;
  }
  fromJSON(json) {
    if (json.$Key)
      for (const propRef of json.$Key) new PropertyRef(this).fromJSON(propRef);
    super.fromJSON(json);
  }
}

class PropertyRef extends ListedModelElement {
  #path;
  #alias;
  constructor(entityType) {
    super(entityType, "$Key");
  }
  get target() {
    return this.#path.target;
  }
  fromJSON(json) {
    if (typeof json === "string")
      this.#path = new RelativePath(this, json, this.parent, "$Key");
    else
      for (const name in json) {
        this.#alias = name;

        this.#path = new RelativePath(this, json[name], this.parent, "$Key");
      }
  }
  toJSON() {
    if (this.#alias) {
      const propRef = {};
      propRef[this.#alias] = this.#path;
      return propRef;
    } else return this.#path.toJSON();
  }
}

class TypedModelElement extends NamedModelElement {
  fromJSON(json) {
    this.$Type = new QualifiedNamePath(this, json.$Type, "$Type");

    super.fromJSON(json);
  }

  evaluateSegment(segment) {
    return this.$Type.evaluateSegment(segment);
  }
}
class AbstractProperty extends TypedModelElement {
  evaluationStart(anno) {
    if (anno.descendantOf(this)) return this.parent;
  }
}
class Property extends AbstractProperty {
  constructor(parent, name) {
    super(parent, name);
    delete this.$Kind;
  }

  fromJSON(json) {
    if (!json.$Type) json = { ...json, $Type: "Edm.String" };

    super.fromJSON(json);
  }
  toJSON() {
    const json = { ...super.toJSON() };
    if (this.$Type.evaluate().toJSON() === "Edm.String") delete json.$Type;
    return json;
  }
}

class NavigationProperty extends AbstractProperty {
  fromJSON(json) {
    if (json.$Partner)
      this.$Partner = new RelativePath(this, json.$Partner, this, "$Partner");

    for (const ref in json.$ReferentialConstraint)
      if (!ref.includes("@"))
        new ReferentialConstraint(this, ref).fromJSON(
          json.$ReferentialConstraint,
        );

    super.fromJSON(json);
  }

  toJSON() {
    return this.toJSONWithAnnotations("$ReferentialConstraint", super.toJSON());
  }
}

class NamedSubElement extends NamedModelElement {
  constructor(parent, sub, name) {
    super(parent, name);
    parent[sub] ||= {};
    parent[sub][name] = this;
    delete this.$Kind;
  }

  fromJSON(json) {
    let hasAnnotations = false;
    for (const member in json)
      if (member.startsWith(this.name + "@"))
        if (
          this.annotationFromJSON(
            json,
            member.substring(this.name.length),
            json[member],
          )
        )
          hasAnnotations = true;

    if (hasAnnotations) this.csdlDocument.annotationTargets.push(this);
  }
}

class ReferentialConstraint extends NamedSubElement {
  #dependent;
  get dependent() {
    return this.#dependent;
  }

  set dependent(dependent) {
    this.#dependent = dependent;
  }

  #principal;
  get principal() {
    return this.#principal;
  }

  set principal(principal) {
    this.#principal = principal;
  }

  constructor(navigationProperty, prop) {
    super(navigationProperty, "$ReferentialConstraint", prop);
  }
  fromJSON(json) {
    this.dependent = new RelativePath(
      this,
      this.name,
      this.parent.parent,
      "$ReferentialConstraint.Dependent",
    );
    this.principal = new RelativePath(
      this,
      json[this.name],
      this.parent,
      "$ReferentialConstraint.Principal",
    );
    super.fromJSON(json);
  }
  toJSON() {
    return this.principal.toJSON();
  }
}

class EnumType extends NamedModelElement {
  fromJSON(json) {
    super.fromJSON(json, "Member");
  }

  toJSON() {
    return NamedValue.toJSONWithAnnotations(this, super.toJSON());
  }
}

class NamedValue extends NamedModelElement {
  #value;
  get value() {
    return this.#value;
  }

  fromJSON(json) {
    this.#value = json;
  }
  toJSON() {
    return this.value;
  }

  static toJSONWithAnnotations(modelElement, json) {
    for (const member in modelElement.children)
      for (const anno in modelElement.children[member])
        if (anno.startsWith("@"))
          json[member + anno] = modelElement.children[member][anno];
    return json;
  }
}
class Member extends NamedValue {}

class TypeDefinition extends NamedModelElement {
  fromJSON(json) {
    this.$UnderlyingType = new QualifiedNamePath(
      this,
      json.$UnderlyingType,
      "$UnderlyingType",
    );

    super.fromJSON(json);
  }
}

class Operation extends ModelElement {
  constructor(parent) {
    super(parent);
    this.$Kind = this.constructor.name;
  }
  fromJSON(json) {
    if (json.$ReturnType) {
      this.$ReturnType = new ReturnType(this);
      this.$ReturnType.fromJSON(json.$ReturnType);
    }

    if (json.$Parameter) {
      for (const param of json.$Parameter) new Parameter(this).fromJSON(param);
    }

    super.fromJSON(json);
  }

  evaluateSegment(segment) {
    return segment.segment === "$ReturnType"
      ? this.$ReturnType
      : this.$Parameters?.find?.((p) => p.name === segment.segment);
  }
}
class Action extends Operation {}

class Function extends Operation {}

class ReturnType extends ModelElement {
  fromJSON(json) {
    if (!json.$Type) json = { ...json, $Type: "Edm.String" };

    this.$Type = new QualifiedNamePath(this, json.$Type, "$Type");

    super.fromJSON(json);
  }
  toJSON() {
    const json = { ...this };
    if (this.$Type.evaluate().toJSON() === "Edm.String") delete json.$Type;
    return json;
  }
}

class Parameter extends ListedModelElement {
  constructor(operation) {
    super(operation, "$Parameter");
  }
  fromJSON(json) {
    if (!json.$Type) json = { ...json, $Type: "Edm.String" };

    this.$Type = new QualifiedNamePath(this, json.$Type, "$Type");

    super.fromJSON(json);
  }
  toJSON() {
    const json = { ...this };
    if (this.$Type.evaluate().toJSON() === "Edm.String") delete json.$Type;
    return json;
  }
}

class EntityContainer extends NamedModelElement {
  fromJSON(json) {
    if (json.$Extends)
      this.$Extends = new QualifiedNamePath(this, json.$Extends, "$Extends");

    super.fromJSON(json, function (json) {
      if (json.$Type) return "EntitySetOrSingleton";
      if (json.$Function) return "FunctionImport";
      if (json.$Action) return "ActionImport";
    });
  }
}

class EntitySetOrSingleton extends TypedModelElement {
  constructor(parent, name) {
    super(parent, name);
    delete this.$Kind;
  }

  fromJSON(json) {
    for (const prop in json.$NavigationPropertyBinding)
      if (!prop.includes("@"))
        new NavigationPropertyBinding(this, prop).fromJSON(
          json.$NavigationPropertyBinding,
        );

    super.fromJSON(json);
  }
}

class NavigationPropertyBinding extends NamedSubElement {
  #navigationProperty;
  get navigationProperty() {
    return this.#navigationProperty;
  }

  set navigationProperty(navigationProperty) {
    this.#navigationProperty = navigationProperty;
  }
  #entitySet;
  get entitySet() {
    return this.#entitySet;
  }

  set entitySet(entitySet) {
    this.#entitySet = entitySet;
  }
  constructor(entitySetOrSingleton, prop) {
    super(entitySetOrSingleton, "$NavigationPropertyBinding", prop);
  }
  fromJSON(json) {
    this.navigationProperty = new RelativePath(
      this,
      this.name,
      this.parent,
      "$NavigationPropertyBinding",
    );
    this.entitySet = new RelativePath(
      this,
      json[this.name],
      json[this.name].includes(".") ? this.csdlDocument : this.parent.parent,
      this.parent.parent,
      "$NavigationPropertyBinding.Target",
    );
    super.fromJSON(json);
  }
  toJSON() {
    return this.entitySet.toJSON();
  }
}

class OperationImport extends NamedModelElement {
  constructor(parent, name) {
    super(parent, name);
    delete this.$Kind;
  }

  fromJSON(json) {
    if (json.$EntitySet)
      this.$EntitySet = new RelativePath(
        this,
        json.$EntitySet,
        this.parent,
        "$EntitySet",
      );
    super.fromJSON(json);
  }
}
class ActionImport extends OperationImport {
  fromJSON(json) {
    this.$Action = new QualifiedNamePath(this, json.$Action, "$Action");

    super.fromJSON(json);
  }
}

class FunctionImport extends OperationImport {
  fromJSON(json) {
    this.$Function = new QualifiedNamePath(this, json.$Function, "$Function");

    super.fromJSON(json);
  }
}

class Term extends Property {
  fromJSON(json) {
    if (json.$BaseTerm)
      this.$BaseTerm = new QualifiedNamePath(this, json.$BaseTerm, "$BaseTerm");

    super.fromJSON(json);
  }
}

class Annotation extends ModelElement {
  #target;
  get target() {
    return this.#target;
  }

  #term;
  get term() {
    return this.#term;
  }

  #qualifier;
  get qualifier() {
    return this.#qualifier;
  }

  #value;
  get value() {
    return this.#value;
  }

  set value(value) {
    this.#value = value;
  }

  constructor(host, target, term, qualifier) {
    super(host);
    this.#target = target;
    this.#term = new QualifiedNamePath(this, term, "term");
    this.#qualifier = qualifier;
  }
  fromJSON(json) {
    this.value = this.dynamicExprFromJSON(json);
  }
  toJSON() {
    return this.value.toJSON?.() || this.value;
  }

  get host() {
    return this.target.target.host;
  }

  get annotation() {
    return this;
  }
}

class RelativePath extends AbstractPath {
  #relativeTo;
  #absolute = "";
  constructor(host, path, relativeTo, attribute) {
    super(host, attribute);

    if (path.startsWith("/")) {
      this.#absolute = "/";
      path = path.substring(1);
      relativeTo = this.csdlDocument;
    }

    this.#relativeTo = relativeTo;
    this.segments = path.split("/").map(
      function (segment) {
        switch (true) {
          case segment.includes(".") && segment.includes("("):
            return new OverloadSegment(this, segment);

          case !segment.startsWith("@") && segment.includes("."):
            return new QualifiedNameSegment(this, segment);

          case segment.startsWith("@"):
            return new TermCastSegment(this, segment);

          default:
            return new RelativeSegment(this, segment);
        }
      }.bind(this),
    );

    this.csdlDocument.paths?.push(this);
  }
  relativeTo() {
    return this.#relativeTo;
  }
  toJSON() {
    return this.#absolute + super.toJSON();
  }

  evaluate() {
    let target = this.relativeTo();
    for (let i = 0; i < this.segments.length; i++) {
      target = this.segments[i].target =
        this.segments[i].evaluateRelativeTo(target);

      if (!target) throw new InvalidPathError(this);
      if (this.csdlDocument.paths && i < this.segments.length - 1)
        target.targetingSegments.add(this.segments[i]);
    }

    if (this.csdlDocument.paths) target.targetingPaths?.add(this);

    return target;
  }
}
class TermCastSegment extends Segment {
  evaluateRelativeTo(modelElement) {
    const termcast = this.segment.replace(
      /(?<=@).*?(?=#|$)/,

      function (m) {
        return this.path.csdlDocument.unalias(m);
      }.bind(this),
    );
    return modelElement[termcast];
  }
}

class RelativeSegment extends Segment {
  evaluateRelativeTo(modelElement) {
    return this.segment ? modelElement.evaluateSegment(this) : modelElement;
  }
}

const csdlDocuments = new Map();

class InvalidPathError extends Error {
  constructor(path) {
    super("Invalid path " + path.toJSON());
  }
}

class ValuePath extends RelativePath {
  constructor(pathExpression, path) {
    super(pathExpression, path, undefined, "$Path");
  }
  relativeTo() {
    const anno = this.parent.annotation;
    return anno.host.evaluationStart(anno);
  }
}
class PathExpression extends ModelElement {
  constructor(parent, path) {
    super(parent);
    this.$Path = new ValuePath(this, path);
  }

  get annotation() {
    return this.parent.annotation;
  }
}

class ModelElementPathExpression extends PathExpression {
  toJSON() {
    return this.$Path.toJSON();
  }
}
class AnnotationPath extends ModelElementPathExpression {}

class ModelElementPath extends ModelElementPathExpression {}

class NavigationPropertyPath extends ModelElementPathExpression {}

class PropertyPath extends ModelElementPathExpression {}

class Path extends PathExpression {}

class BinaryExpression extends ModelElement {
  #left;
  get left() {
    return this.#left;
  }

  #right;
  get right() {
    return this.#right;
  }

  get annotation() {
    return this.parent.annotation;
  }

  fromJSON(json) {
    this.#left = this.dynamicExprFromJSON(json[0]);
    this.#right = this.dynamicExprFromJSON(json[1]);
  }
  toJSON() {
    return [this.#left, this.#right];
  }
}

class And extends BinaryExpression {}
class Or extends BinaryExpression {}

class Collection extends ModelElement {
  #value;
  get value() {
    return this.#value;
  }

  set value(value) {
    this.#value = value;
  }

  get annotation() {
    return this.parent.annotation;
  }

  fromJSON(json) {
    this.value = json.map((item) => this.dynamicExprFromJSON(item));
  }
  toJSON() {
    return this.value.map((item) => item.toJSON?.() || item);
  }
}

class Record extends ModelElement {
  get annotation() {
    return this.parent.annotation;
  }

  fromJSON(json) {
    super.fromJSON(json, "PropertyValue");
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

  get annotation() {
    return this.parent.annotation;
  }

  fromJSON(json) {
    Annotation.prototype.fromJSON.call(this, json);
  }
  toJSON() {
    return Annotation.prototype.toJSON.call(this.value);
  }
}

const closure = (module.exports = {
  CSDLDocument,
  CSDLReviver,

  Reference,

  Include,

  IncludeAnnotations,

  Schema,

  QualifiedNamePath,

  ComplexType,
  EntityType,

  PropertyRef,

  Property,

  NavigationProperty,

  ReferentialConstraint,

  EnumType,

  Member,

  TypeDefinition,

  Action,

  Function,

  ReturnType,

  Parameter,

  EntityContainer,

  EntitySetOrSingleton,

  NavigationPropertyBinding,

  ActionImport,

  FunctionImport,

  Term,

  Annotation,

  RelativePath,

  InvalidPathError,

  AnnotationPath,

  ModelElementPath,

  NavigationPropertyPath,

  PropertyPath,

  Path,

  And,
  Or,

  Collection,

  Record,
  PropertyValue,
});
