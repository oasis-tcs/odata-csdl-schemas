/**
 * Converts OData CSDL XML 2.0 and 4.0x to OData CSDL JSON
*/

//TODO:
// - read vocabulary to find out type of term to correctly determine "empty" value

const sax = require('sax');

module.exports.xml2json = function (xml, lineNumbers = false) {
    const result = {};
    const alias = { Edm: 'Edm', odata: 'odata' };
    const namespace = {};
    const namespaceUri = {};

    const preV4 = {
        association: {},
        associationSets: [],
        referentialConstraints: [],
        entitySet: {},
        current: {
            association: null,
            associationSet: null,
            namespace: null
        },
        hasDocumenation: false
    };

    const preParser = sax.parser(true, { xmlns: true });
    preParser.onopentag = function (node) {
        switch (node.local) {
            case 'Edmx':
                setAttributes(result, node, ['Version']);
                break;
            case 'DataServices': {
                const version = Object.values(node.attributes).find(attr => attr.local == 'DataServiceVersion');
                if (version) result.$Version = version.value;
                break;
            }
            case 'Reference':
                namespaceUri.$current = node.attributes.Uri.value;
                break;
            case 'Include':
                namespaceUri[node.attributes.Namespace.value] = namespaceUri.$current;
                if (node.attributes.hasOwnProperty('Alias'))
                    namespaceUri[node.attributes.Alias.value] = namespaceUri.$current;
            //intentionally no break
            case 'Schema':
                if (node.attributes.hasOwnProperty('Alias')) {
                    alias[node.attributes.Namespace.value] = node.attributes.Alias.value;
                    alias[node.attributes.Alias.value] = node.attributes.Alias.value;
                    namespace[node.attributes.Alias.value] = node.attributes.Namespace.value;
                } else {
                    alias[node.attributes.Namespace.value] = node.attributes.Namespace.value;
                }
                namespace[node.attributes.Namespace.value] = node.attributes.Namespace.value;
                preV4.current.namespace = node.attributes.Namespace.value;
                break;
            case 'Association': {
                const name = preV4.current.namespace + '.' + node.attributes.Name.value;
                preV4.current.association = preV4.association[name] || {}
                preV4.association[name] = preV4.current.association;
                //preV4.association[name2] = preV4.current.association;
                break;
            }
            case 'NavigationProperty':
                if (result.$Version < '4.0') {
                    const parts = nameParts(node.attributes.Relationship.value);
                    const name = namespace[parts.qualifier] + '.' + parts.name;
                    const association = preV4.association[name] || {};
                    const end = association[node.attributes.FromRole.value] || {};
                    end.$Partner = node.attributes.Name.value;
                    association[node.attributes.FromRole.value] = end;
                    preV4.association[name] = association;
                }
                break;
            case 'AssociationSet':
                preV4.current.associationSet = {
                    associationName: node.attributes.Association.value,
                    ends: []
                };
                preV4.associationSets.push(preV4.current.associationSet);
                break;
            case 'End':
                if (preV4.current.association) {
                    preV4.current.associationEnd = preV4.current.association[node.attributes.Role.value] || {};
                    preV4.current.associationEnd.type = normalizeTarget(node.attributes.Type.value);
                    preV4.current.associationEnd.mult = node.attributes.Multiplicity.value;
                    preV4.current.association[node.attributes.Role.value] = preV4.current.associationEnd;
                } else if (preV4.current.associationSet) {
                    preV4.current.associationSet.ends.push({
                        set: node.attributes.EntitySet.value,
                        role: node.attributes.Role.value
                    });
                }
                break;
            case 'OnDelete':
                if (result.$Version < '4.0') {
                    preV4.current.associationEnd.onDelete = node.attributes.Action.value;
                }
                break;
            case 'ReferentialConstraint':
                if (result.$Version < '4.0') {
                    preV4.current.referentialConstraint = {
                        association: preV4.current.association,
                        principalProperties: [],
                        dependentProperties: []
                    };
                    preV4.referentialConstraints.push(preV4.current.referentialConstraint);
                }
                break;
            case 'Principal':
                preV4.current.referentialConstraint.properties = preV4.current.referentialConstraint.principalProperties;
                break;
            case 'Dependent':
                preV4.current.referentialConstraint.properties = preV4.current.referentialConstraint.dependentProperties;
                preV4.current.referentialConstraint.dependentRole = node.attributes.Role.value;
                break;
            case 'PropertyRef':
                if (preV4.current.referentialConstraint)
                    preV4.current.referentialConstraint.properties.push(node.attributes.Name.value);
                break;
            case 'Documentation':
                preV4.hasDocumentation = true;
                break;
        }
    }
    preParser.onclosetag = function (tag) {
        switch (tag) {
            case 'Schema':
                preV4.current.namespace = null;
                break;
            case 'Association':
                preV4.current.association = null;
                break;
            case 'AssociationSet':
                preV4.current.associationSet = null;
                break;
            case 'End':
                preV4.current.associationEnd = null;
                break;
            case 'ReferentialConstraint':
                preV4.current.referentialConstraint = null;
                break;
            case 'Principal':
            case 'Dependent':
                delete preV4.current.referentialConstraint.properties;
                break;
        }
    }
    preParser.write(xml).close();

    preV4.associationSets.forEach(associationSet => {
        const parts = nameParts(associationSet.associationName);
        const assoc = preV4.association[namespace[parts.qualifier] + '.' + parts.name];
        associationSet.ends.forEach((end, i) => {
            const other = associationSet.ends[1 - i];
            if (!preV4.entitySet.hasOwnProperty(end.set)) preV4.entitySet[end.set] = [];
            if (assoc[end.role].$Partner) {
                preV4.entitySet[end.set].push({
                    path: assoc[end.role].$Partner,
                    type: assoc[end.role].type,
                    target: other.set
                });
            }
        });
    });

    preV4.referentialConstraints.forEach(constraint => {
        const c = {};
        constraint.association[constraint.dependentRole].constraint = c;
        constraint.dependentProperties.forEach((property, i) => {
            c[property] = constraint.principalProperties[i];
        });
    });

    const current = { annotatable: [], annotation: [] };
    const last = { target: null };
    const parser = sax.parser(true, { xmlns: true });

    parser.onerror = function (e) {
        console.log(e);
    }

    parser.onopentag = function (node) {
        const attributeExpressions = [
            'Binary', 'Bool', 'Date', 'DateTimeOffset', 'Decimal', 'Duration', 'EnumMember', 'Float', 'Guid', 'Int', 'String', 'TimeOfDay',
            'AnnotationPath', 'ModelElementPath', 'NavigationPropertyPath', 'PropertyPath', 'Path', 'UrlRef'];
        //TODO: check node.uri for correct namespace(s) - helper function
        //TODO: check attributes to have no namespace
        let annotatable = { target: null, prefix: '' };
        let annotation = {};

        switch (node.local) {
            case 'Reference': {
                current.reference = {};
                let uri = node.attributes.Uri.value;
                if (uri.startsWith('https://oasis-tcs.github.io/odata-vocabularies/vocabularies/') && uri.endsWith('.xml'))
                    uri = uri.substring(0, uri.length - 3) + 'json';
                if (!result.hasOwnProperty('$Reference')) result.$Reference = {};
                result.$Reference[uri] = current.reference;
                annotatable.target = current.reference;
                break;
            }
            case 'Include':
                current.include = {};
                setAttributes(current.include, node, ['Namespace', 'Alias']);
                if (!current.reference.hasOwnProperty('$Include')) current.reference.$Include = [];
                current.reference.$Include.push(current.include);
                annotatable.target = current.include;
                break;
            case 'IncludeAnnotations':
                current.includeAnnotations = {};
                setAttributes(current.includeAnnotations, node, ['TargetNamespace', 'TermNamespace', 'Qualifier']);
                if (!current.reference.hasOwnProperty('$IncludeAnnotations')) current.reference.$IncludeAnnotations = [];
                current.reference.$IncludeAnnotations.push(current.includeAnnotations);
                annotatable.target = current.includeAnnotations;
                break;
            case 'Schema':
                current.schema = {};
                current.schemaName = node.attributes.Namespace.value;
                setAttributes(current.schema, node, ['Alias']);
                result[node.attributes.Namespace.value] = current.schema;
                annotatable.target = current.schema;
                break;
            case 'EntityType':
                current.type = { $Kind: node.local };
                addLineNumber(current.type);
                setAttributes(current.type, node, ['Abstract', 'BaseType', 'HasStream', 'OpenType']);
                if (result.$Version < '4.0') {
                    const hasStream = Object.values(node.attributes).find(attr => attr.local == 'HasStream');
                    if (hasStream && hasStream.value == 'true') current.type.$HasStream = true;
                }
                current.schema[node.attributes.Name.value] = current.type;
                annotatable.target = current.type;
                break;
            case 'Key':
                current.type.$Key = [];
                break;
            case 'PropertyRef':
                if (current.type) {
                    const attr = {};
                    setAttributes(attr, node, ['Name', 'Alias']);
                    if (attr.hasOwnProperty('$Alias')) {
                        const key = {};
                        key[attr.$Alias] = attr.$Name;
                        current.type.$Key.push(key)
                    } else {
                        current.type.$Key.push(attr.$Name);
                    }
                }
                break;
            case 'ComplexType':
                current.type = { $Kind: node.local };
                addLineNumber(current.type);
                setAttributes(current.type, node, ['Abstract', 'BaseType', 'OpenType']);
                current.schema[node.attributes.Name.value] = current.type;
                annotatable.target = current.type;
                break;
            case 'NavigationProperty':
                current.property = { $Kind: node.local };
                addLineNumber(current.property);
                if (result.$Version < '4.0') {
                    const parts = nameParts(node.attributes.Relationship.value);
                    const association = preV4.association[namespace[parts.qualifier] + '.' + parts.name];
                    const toEnd = association[node.attributes.ToRole.value];
                    current.property.$Type = toEnd.type;
                    if (toEnd.mult == '*') current.property.$Collection = true;
                    if (toEnd.mult == '0..1') current.property.$Nullable = true;
                    if (toEnd.$Partner) current.property.$Partner = toEnd.$Partner;
                    const fromEnd = association[node.attributes.FromRole.value];
                    if (fromEnd.onDelete) current.property.$OnDelete = fromEnd.onDelete;
                    if (fromEnd.constraint) current.property.$ReferentialConstraint = fromEnd.constraint;
                } else {
                    setAttributes(current.property, node, ['Type', 'Nullable', 'ContainsTarget', 'Partner']);
                }
                current.type[node.attributes.Name.value] = current.property;
                annotatable.target = current.property;
                break;
            case 'OnDelete':
                if (current.property) {
                    current.property.$OnDelete = node.attributes.Action.value;
                    annotatable.target = current.property;
                    annotatable.prefix = '$OnDelete';
                }
                break;
            case 'ReferentialConstraint':
                if (current.property) {
                    if (!current.property.hasOwnProperty('$ReferentialConstraint')) current.property.$ReferentialConstraint = {};
                    current.property.$ReferentialConstraint[node.attributes.Property.value] = node.attributes.ReferencedProperty.value;
                    annotatable.target = current.property.$ReferentialConstraint;
                    annotatable.prefix = node.attributes.Property.value;
                }
                break;
            case 'Property':
                current.property = {};
                addLineNumber(current.property);
                setAttributes(current.property, node, ['Type', 'Nullable', 'MaxLength', 'Unicode', 'Precision', 'Scale', 'SRID', 'DefaultValue']);
                current.type[node.attributes.Name.value] = current.property;
                annotatable.target = current.property;
                break;
            case 'EnumType':
                current.type = { $Kind: node.local };
                addLineNumber(current.type);
                current.enumMemberValue = 0;
                setAttributes(current.type, node, ['UnderlyingType', 'IsFlags']);
                current.schema[node.attributes.Name.value] = current.type;
                annotatable.target = current.type;
                break;
            case 'Member': {
                const member = node.attributes.Name.value;
                const value = Number(getAttribute(node, 'Value'));
                addLineNumber(current.type, member);
                current.type[member] = (Number.isNaN(value) ? current.enumMemberValue : value);
                current.enumMemberValue++;
                annotatable.target = current.type;
                annotatable.prefix = node.attributes.Name.value;
                break;
            }
            case 'TypeDefinition':
                current.type = { $Kind: node.local };
                addLineNumber(current.type);
                setAttributes(current.type, node, ['UnderlyingType', 'MaxLength', 'Unicode', 'Precision', 'Scale', 'SRID']);
                current.schema[node.attributes.Name.value] = current.type;
                annotatable.target = current.type;
                break;
            case 'Action':
                current.overload = { $Kind: node.local };
                addLineNumber(current.overload);
                setAttributes(current.overload, node, ['EntitySetPath', 'IsBound']);
                if (!current.schema.hasOwnProperty(node.attributes.Name.value)) current.schema[node.attributes.Name.value] = [];
                if (Array.isArray(current.schema[node.attributes.Name.value])) current.schema[node.attributes.Name.value].push(current.overload);
                annotatable.target = current.overload;
                break;
            case 'Function':
                current.overload = { $Kind: node.local };
                addLineNumber(current.overload);
                setAttributes(current.overload, node, ['EntitySetPath', 'IsBound', 'IsComposable']);
                if (!current.schema.hasOwnProperty(node.attributes.Name.value)) current.schema[node.attributes.Name.value] = [];
                if (Array.isArray(current.schema[node.attributes.Name.value])) current.schema[node.attributes.Name.value].push(current.overload);
                annotatable.target = current.overload;
                break;
            case 'Parameter': {
                const parameter = { $Name: node.attributes.Name.value };
                setAttributes(parameter, node, ['Type', 'Nullable', 'MaxLength', 'Unicode', 'Precision', 'Scale', 'SRID']);
                if (!current.overload.hasOwnProperty('$Parameter')) current.overload.$Parameter = [];
                current.overload.$Parameter.push(parameter);
                annotatable.target = parameter;
                break;
            }
            case 'ReturnType':
                current.overload.$ReturnType = {};
                setAttributes(current.overload.$ReturnType, node, ['Type', 'Nullable', 'MaxLength', 'Unicode', 'Precision', 'Scale', 'SRID']);
                annotatable.target = current.overload.$ReturnType;
                break;
            case 'EntityContainer':
                result.$EntityContainer = current.schemaName + '.' + node.attributes.Name.value;
                current.container = { $Kind: node.local };
                setAttributes(current.container, node, ['Extends']);
                current.schema[node.attributes.Name.value] = current.container;
                annotatable.target = current.container;
                break;
            case 'EntitySet': {
                current.containerChild = { $Collection: true };
                setAttributes(current.containerChild, node, ['EntityType', 'IncludeInServiceDocument']);
                current.container[node.attributes.Name.value] = current.containerChild;
                annotatable.target = current.containerChild;
                const bindings = preV4.entitySet[node.attributes.Name.value];
                if (bindings && bindings.length > 0) {
                    current.containerChild.$NavigationPropertyBinding = {};
                    bindings.forEach(binding => {
                        const path = (binding.type != current.containerChild.$Type ? binding.type + '/' : '') + binding.path;
                        current.containerChild.$NavigationPropertyBinding[path] = binding.target;
                    });
                }
                break;
            }
            case 'Singleton':
                current.containerChild = {};
                setAttributes(current.containerChild, node, ['Type', 'Nullable']);
                current.container[node.attributes.Name.value] = current.containerChild;
                annotatable.target = current.containerChild;
                break;
            case 'ActionImport':
                current.containerChild = {};
                setAttributes(current.containerChild, node, ['Action', 'EntitySet']);
                current.container[node.attributes.Name.value] = current.containerChild;
                annotatable.target = current.containerChild;
                break;
            case 'FunctionImport':
                current.containerChild = {};
                if (result.$Version < '4.0') {
                    const method = Object.values(node.attributes).find(attr => attr.local == 'HttpMethod');
                    const operationName = current.schemaName + '.' + node.attributes.Name.value;
                    current.overload = {};
                    if (method == null) {
                        if (node.attributes.IsBindable && node.attributes.IsBindable.value == 'true') {
                            current.overload.$IsBound = true;
                            annotatable.target = current.overload;
                        } else {
                            current.container[node.attributes.Name.value] = current.containerChild;
                            annotatable.target = current.containerChild;
                        }
                        if (node.attributes.IsSideEffecting && node.attributes.IsSideEffecting.value == 'false') {
                            current.overload.$Kind = 'Function';
                            if (!current.overload.$IsBound) current.containerChild.$Function = operationName;
                        } else {
                            current.overload.$Kind = 'Action';
                            if (!current.overload.$IsBound) current.containerChild.$Action = operationName;
                        }
                    } else if (method.value == 'GET') {
                        current.containerChild.$Function = operationName;
                        current.overload.$Kind = 'Function';
                        current.container[node.attributes.Name.value] = current.containerChild;
                        annotatable.target = current.containerChild;
                    } else {
                        current.containerChild.$Action = operationName;
                        current.overload.$Kind = 'Action';
                        current.container[node.attributes.Name.value] = current.containerChild;
                        annotatable.target = current.containerChild;
                    }
                    setAttributes(current.containerChild, node, ['EntitySet']);
                    const returnType = node.attributes.ReturnType;
                    if (returnType) {
                        current.overload.$ReturnType = {};
                        setAttributes(current.overload.$ReturnType, node, ['ReturnType'])
                    }
                    current.schema[node.attributes.Name.value] = [current.overload];
                } else {
                    setAttributes(current.containerChild, node, ['Function', 'EntitySet', 'IncludeInServiceDocument']);
                    current.container[node.attributes.Name.value] = current.containerChild;
                    annotatable.target = current.containerChild;
                }
                break;
            case 'NavigationPropertyBinding': {
                if (!current.containerChild.hasOwnProperty('$NavigationPropertyBinding')) current.containerChild.$NavigationPropertyBinding = {};
                let target = normalizeTarget(node.attributes.Target.value);
                if (target.startsWith(normalizeTarget(result.$EntityContainer) + '/')) target = target.substring(target.indexOf('/') + 1);
                current.containerChild.$NavigationPropertyBinding[node.attributes.Path.value] = target;
                break;
            }
            case 'Term': {
                const term = { $Kind: node.local };
                addLineNumber(term);
                setAttributes(term, node, ['Type', 'Nullable', 'DefaultValue', 'AppliesTo', 'BaseTerm']);
                current.schema[node.attributes.Name.value] = term;
                annotatable.target = term;
                break;
            }
            case 'Annotations': {
                const target = normalizeTarget(getAttribute(node, 'Target'));
                if (!current.schema.hasOwnProperty('$Annotations')) current.schema.$Annotations = {};
                if (!current.schema.$Annotations.hasOwnProperty(target)) current.schema.$Annotations[target] = {};
                annotatable.target = current.schema.$Annotations[target];
                current.qualifier = getAttribute(node, 'Qualifier');
                break;
            }
            case 'Documentation':
                annotatable.target = last.target;
                break;
            case 'Summary':
            case 'LongDescription':
                current.text = '';
                annotation.$Term = 'Org.OData.Core.V1.' + (node.local === 'Summary' ? 'Description' : node.local);
            case 'ValueAnnotation':
            case 'Annotation':
                setAttributes(annotation, node, ['Term', 'Qualifier'].concat(attributeExpressions));
                current.annotation.unshift(annotation);
                annotatable.target = current.annotatable[0].target;
                annotatable.prefix = current.annotatable[0].prefix + '@' + normalizeTarget(annotation.$Term)
                    + (current.qualifier ? '#' + current.qualifier : '')
                    + (annotation.$Qualifier ? '#' + annotation.$Qualifier : '');
                break;
            case 'Collection':
                annotation.value = [];
                current.annotation.unshift(annotation);
                break;
            case 'Record':
                annotation.value = record(node);
                addLineNumber(annotation.value);
                current.annotation.unshift(annotation);
                annotatable.target = current.annotation[0].value;
                break;
            case 'PropertyValue':
                setAttributes(annotation, node, ['Property'].concat(attributeExpressions));
                current.annotation.unshift(annotation);
                annotatable.target = current.annotatable[0].target;
                annotatable.prefix = annotation.$Property;
                break;
            case 'Apply':
                setAttributes(annotation, node, ['Function']);
                annotation.value = [];
                current.annotation.unshift(annotation);
                annotatable.target = annotation;
                break;
            case 'Add':
            case 'And':
            case 'Div':
            case 'DivBy':
            case 'Eq':
            case 'Ge':
            case 'Gt':
            case 'Has':
            case 'If':
            case 'In':
            case 'Le':
            case 'Lt':
            case 'Mod':
            case 'Mul':
            case 'Ne':
            case 'Or':
            case 'Sub':
                annotation.value = [];
                current.annotation.unshift(annotation);
                annotatable.target = annotation;
                break;
            case 'Cast':
            case 'IsOf':
                setAttributes(annotation, node, ['Type', 'MaxLength', 'Unicode', 'Precision', 'Scale', 'SRID']);
                current.annotation.unshift(annotation);
                annotatable.target = annotation;
                break;
            case 'LabeledElement':
                setAttributes(annotation, node, ['Name'].concat(attributeExpressions));
                current.annotation.unshift(annotation);
                annotatable.target = annotation;
                break;
            case 'Neg':
            case 'Not':
            case 'Null':
                annotation.value = {};
                current.annotation.unshift(annotation);
                annotatable.target = annotation;
                break;
            case 'UrlRef':
                current.annotation.unshift(annotation);
                annotatable.target = annotation;
                break;
            case 'String':
                current.text = '';
                break;
        }

        current.annotatable.unshift(annotatable);
        last.target = annotatable.target;
    }

    parser.ontext = function (text) {
        current.text = text;
    }

    parser.onclosetag = function (tag) {
        switch (tag) {
            case 'Edmx':
                break;
            case 'Reference':
                current.reference = null;
                break;
            case 'Include':
                current.include = null;
                break;
            case 'Schema':
                current.schema = null;
                current.schemaName = null;
                break;
            case 'ComplexType':
            case 'EntityType':
                current.type = null;
                break;
            case 'NavigationProperty':
            case 'Property':
                current.property = null;
                break;
            case 'EnumType':
                current.enumMemberValue = null;
                break;
            case 'Action':
            case 'Function':
                current.overload = null;
                break;
            case 'ActionImport':
            case 'EntitySet':
            case 'FunctionImport':
            case 'Singleton':
                current.containerChild = null;
                break;
            case 'Annotations':
                current.qualifier = null;
                break;
            case 'Summary':
            case 'LongDescription':
                if (current.text.length === 0) {
                    current.text = null;
                    break;
                }
                updateValue(current.annotation[0], current.text.replace(/\r\n|\r(?!\n)/g, '\n'));
                current.text = null;
            case 'ValueAnnotation':
            case 'Annotation': {
                let annotation = current.annotation.shift();
                if (current.annotatable[1].target != null) {
                    const name = current.annotatable[1].prefix + '@' + normalizeTarget(annotation.$Term)
                        + (current.qualifier ? '#' + current.qualifier : '')
                        + (annotation.$Qualifier ? '#' + annotation.$Qualifier : '')

                    const np = nameParts(annotation.$Term);
                    if (np.name == 'MediaType' && namespace[np.qualifier] == 'Org.OData.Core.V1' && annotation.value == 'application/json') {
                        if (current.annotation.length > 0) {
                            current.annotation[0].$isJSON = true;
                        }
                    }

                    if (annotation.$isJSON || np.name == 'Schema' && namespace[np.qualifier] == 'Org.OData.JSON.V1') {
                        //TODO: check for string value, error handling in case of invalid JSON
                        annotation.value = JSON.parse(annotation.value);
                    }
                    current.annotatable[1].target[name] = annotation.value !== undefined ? annotation.value : true;
                }
                break;
            }
            case 'Record':
            case 'Collection': {
                let annotation = current.annotation.shift();
                updateValue(current.annotation[0], annotation.value);
                break;
            }
            case 'PropertyValue': {
                let annotation = current.annotation.shift();
                if (annotation.$isJSON) {
                    //TODO: check for string value, error handling in case of invalid JSON
                    annotation.value = JSON.parse(annotation.value);
                }
                current.annotation[0].value[annotation.$Property] = annotation.value;
                break;
            }
            case 'Add':
            case 'Apply':
            case 'And':
            case 'Div':
            case 'DivBy':
            case 'Eq':
            case 'Ge':
            case 'Gt':
            case 'Has':
            case 'In':
            case 'Le':
            case 'Lt':
            case 'If':
            case 'Mod':
            case 'Mul':
            case 'Ne':
            case 'Neg':
            case 'Not':
            case 'Or':
            case 'Sub':
            case 'Cast':
            case 'IsOf': {
                let annotation = current.annotation.shift();
                annotation['$' + tag] = annotation.value;
                delete annotation.value;
                updateValue(current.annotation[0], annotation);
                break;
            }
            case 'LabeledElement': {
                let annotation = current.annotation.shift();
                updateValue(current.annotation[0], { $LabeledElement: annotation.value, $Name: annotation.$Name });
                break;
            }
            case 'LabeledElementReference':
            case 'Path': {
                let annotation = {};
                annotation['$' + tag] = normalizePath(current.text);
                updateValue(current.annotation[0], annotation);
                current.text = null;
                break;
            }
            case 'AnnotationPath':
            case 'ModelElementPath':
            case 'NavigationPropertyPath':
            case 'PropertyPath':
                updateValue(current.annotation[0], normalizePath(current.text));
                current.text = null;
                break;
            case 'Bool':
                updateValue(current.annotation[0], current.text === 'true');
                break;
            case 'Binary':
            case 'Date':
            case 'DateTimeOffset':
            case 'Duration':
            case 'Guid':
            case 'TimeOfDay':
                updateValue(current.annotation[0], current.text);
                current.text = null;
                break;
            case 'String':
                updateValue(current.annotation[0], current.text.replace(/\r\n|\r(?!\n)/g, '\n'));
                current.text = null;
                break;
            case 'Decimal':
            case 'Float':
            case 'Int':
                updateValue(current.annotation[0], isNaN(current.text) ? current.text : Number(current.text));
                current.text = null;
                break;
            case 'EnumMember':
                if (current.annotation[0].$Term || current.annotation[0].$Property)
                    updateValue(current.annotation[0], enumValue(current.text))
                else
                    updateValue(current.annotation[0], {
                        $Cast: enumValue(current.text),
                        $Type: current.text.substring(0, current.text.indexOf('/'))
                    });
                current.text = null;
                break;
            case 'Null':
                {
                    let annotation = current.annotation.shift();
                    if (Object.keys(annotation).length === 1)
                        updateValue(current.annotation[0], null);
                    else {
                        annotation.$Null = null;
                        delete annotation.value;
                        updateValue(current.annotation[0], annotation);
                    }
                    break;
                }
            case 'UrlRef': {
                let annotation = current.annotation.shift();
                updateValue(current.annotation[0], { $UrlRef: annotation.value });
                break;
            }
            default:
        }

        current.annotatable.shift();
    }

    /**
     * Add line number to model element, which is either an object or an object member
     * @param {Object} object The model element or wrapper object
     * @param {String} member The value to append or set
     */
    function addLineNumber(object, member) {
        if (lineNumbers) {
            if (member)
                object[member + '@parser.line'] = parser.line + 1;
            else
                object['@parser.line'] = parser.line + 1;
        }
    }

    /**
     * Update annotation value: append if array, replace otherwise
     * @param {Object} annotation The annotation to update
     * @param {Object} value The value to append or set
     */
    function updateValue(annotation, value) {
        if (Array.isArray(annotation.value))
            annotation.value.push(value);
        else
            annotation.value = value;
    }

    /**
     * create JSON enum value from XML enum value
     * @param {string} name The path
     * @return {string} The normalized path
     */
    function enumValue(value) {
        return value.trim().replace(/\s+/g, ' ').split(' ').map(part => {
            return part.substring(part.indexOf('/') + 1);
        }).join(',');
    }

    /**
     * alias-normalize path expression
     * @param {string} name The path
     * @return {string} The normalized path
     */
    function normalizePath(path) {
        return path.split('/').map(part => {
            const at = part.indexOf('@') + 1;
            const prefix = part.substring(0, at);
            const suffix = part.substring(at);
            const dot = suffix.lastIndexOf('.');
            return prefix + (dot === -1 ? suffix : (alias[suffix.substring(0, dot)] || suffix.substring(0, dot)) + suffix.substring(dot));
        }).join('/');
    }

    /**
     * alias-normalize target path
     * @param {string} name The target
     * @return {string} The normalized target
     */
    function normalizeTarget(target) {
        const open = target.indexOf('(');
        const close = target.indexOf(')');
        let path = open === -1 ? target : target.substring(0, open);
        let args = open === -1 ? '' : target.substring(open, close + 1);
        let rest = open === -1 ? '' : target.substring(close + 1);

        path = path.split('/').map(part => {
            const dot = part.lastIndexOf('.');
            return dot === -1 ? part : (alias[part.substring(0, dot)] || part.substring(0, dot)) + part.substring(dot);
        }).join('/');

        if (args !== '') {
            let params = args.substring(1, args.length - 1)
            args = '('
                + params.split(',').map(part => {
                    const dot = part.lastIndexOf('.');
                    return (alias[part.substring(0, dot)] || part.substring(0, dot)) + part.substring(dot);
                }).join(',')
                + ')';
        }

        rest = rest.split('/').map(part => {
            const dot = part.lastIndexOf('.');
            return dot === -1 ? part : (alias[part.substring(0, dot)] || part.substring(0, dot)) + part.substring(dot);
        }).join('/');

        return path + args + rest;
    }

    /**
     * a qualified name consists of a namespace or alias, a dot, and a simple name
     * @param {string} qualifiedName 
     * @return {object} with components qualifier and name
     */
    function nameParts(qualifiedName) {
        const pos = qualifiedName.lastIndexOf('.');
        console.assert(pos > 0, 'Invalid qualified name ' + qualifiedName);
        return {
            qualifier: qualifiedName.substring(0, pos),
            name: qualifiedName.substring(pos + 1)
        };
    }

    /**
     * Get attribute value from an XML node
     * @param {Object} node The XML node
     * @return {string} The record with type
     */
    function record(node) {
        const record = {};
        if (node.attributes.hasOwnProperty('Type')) {
            const type = node.attributes.Type.value;
            const namespace = type.substring(0, type.lastIndexOf('.'));
            const uri = namespaceUri[namespace];
            record[`@${result.$Version <= '4.0' ? 'odata.' : ''}type`] = (uri || '') + '#' + normalizePath(type);
        }
        return record;
    }

    /**
     * Get attribute value from an XML node
     * @param {Object} node The XML node
     * @param {string} name The attribute name
     * @return {string} The attribute value
     */
    function getAttribute(node, name) {
        if (node.attributes.hasOwnProperty(name)) {
            //TODO: check .uri and .prefix are empty - helper function
            return node.attributes[name].value;
        } else {
            return undefined;
        }
    }

    /**
     * Set attributes from an XML node
     * @param {Object} target The object to fill
     * @param {Object} node The XML node
     * @param {Array} names An array of attribute names to extract
     */
    function setAttributes(target, node, names) {
        names.forEach(name => {
            if (node.attributes.hasOwnProperty(name)) {
                //TODO: check .uri and .prefix are empty - helper function
                switch (name) {
                    case 'Abstract':
                    case 'ContainsTarget':
                    case 'HasStream':
                    case 'IsBound':
                    case 'IsComposable':
                    case 'IsFlags':
                    case 'Nullable':
                    case 'OpenType':
                        if (node.attributes[name].value === 'true')
                            target['$' + name] = true;
                        break;
                    case 'Action':
                    case 'Function':
                        target['$' + name] = normalizePath(node.attributes[name].value);
                        break;
                    case 'Alias':
                    case 'Name':
                    case 'Namespace':
                    case 'Partner':
                    case 'Property':
                    case 'Qualifier':
                    case 'TargetNamespace':
                    case 'Term':
                    case 'TermNamespace':
                    case 'UnderlyingType':
                    case 'Version':
                        target['$' + name] = node.attributes[name].value;
                        break;
                    case 'AppliesTo':
                        target['$' + name] = node.attributes[name].value.trim().replace(/\s+/g, ' ').split(' ');
                        break;
                    case 'Alias':
                    case 'Name':
                    case 'Namespace':
                    case 'Partner':
                    case 'Property':
                    case 'Qualifier':
                    case 'Term':
                    case 'UnderlyingType':
                    case 'Version':
                        target['$' + name] = node.attributes[name].value;
                        break;
                    case 'BaseTerm':
                    case 'BaseType':
                    case 'EntitySetPath':
                    case 'Extends':
                        target['$' + name] = normalizeTarget(node.attributes[name].value);
                        break;
                    case 'DefaultValue': {
                        const value = node.attributes[name].value;
                        const type = node.attributes.Type && node.attributes.Type.value;
                        if (value === 'null')
                            target['$' + name] = null;
                        else if (value === 'true')
                            target['$' + name] = true;
                        else if (value === 'false')
                            target['$' + name] = false;
                        else
                            target['$' + name] = (value === "" || isNaN(value) || type === 'Edm.String') ? value : Number(value);
                        break;
                    }
                    case 'EntitySet': {
                        let set = normalizeTarget(node.attributes[name].value);
                        if (set.startsWith(normalizeTarget(result.$EntityContainer) + '/')) set = set.substring(set.indexOf('/') + 1);
                        target['$' + name] = set;
                        break;
                    }
                    case 'EntityType':
                        target.$Type = normalizeTarget(node.attributes[name].value);
                        break;
                    case 'MaxLength':
                        if (node.attributes[name].value !== 'max')
                            target['$' + name] = Number(node.attributes[name].value);
                        break;
                    case 'Precision':
                    case 'SRID':
                        target['$' + name] = (node.attributes[name].value === "" || isNaN(node.attributes[name].value)) ? node.attributes[name].value : Number(node.attributes[name].value);
                    case 'Unicode':
                        if (node.attributes[name].value === 'false')
                            target['$' + name] = false;
                        break;
                    case 'IncludeInServiceDocument':
                        if (node.local === 'EntitySet' && node.attributes[name].value === 'false')
                            target['$' + name] = false;
                        else if (node.local === 'FunctionImport' && node.attributes[name].value === 'true')
                            target['$' + name] = true;
                        break;
                    case 'Scale':
                        if (node.attributes[name].value !== 'variable' || node.local === 'Cast' || node.local === 'IsOf')
                            target['$' + name] = isNaN(node.attributes[name].value) ? node.attributes[name].value : Number(node.attributes[name].value);
                        break;
                    case 'ReturnType':
                    case 'Type': {
                        let type = node.attributes[name].value;
                        if (type.substring(0, 11) === 'Collection(') {
                            target['$Collection'] = true;
                            type = type.substring(11, type.length - 1);
                        }
                        if (type !== 'Edm.String')
                            target['$Type'] = normalizeTarget(type);
                        break;
                    }
                    case 'AnnotationPath':
                    case 'ModelElementPath':
                    case 'NavigationPropertyPath':
                    case 'PropertyPath':
                        target.value = normalizePath(node.attributes[name].value);
                        break;
                    case 'Path':
                        target.value = { $Path: normalizePath(node.attributes[name].value) };
                        break;
                    case 'String':
                        target.value = node.attributes[name].value.replace(/\r\n|\r(?!\n)/g, '\n');
                        break;
                    case 'Binary':
                    case 'Date':
                    case 'DateTimeOffset':
                    case 'Duration':
                    case 'Guid':
                    case 'TimeOfDay':
                        target.value = node.attributes[name].value;
                        break;
                    case 'Bool':
                        target.value = node.attributes[name].value === 'true';
                        break;
                    case 'Decimal':
                    case 'Float':
                    case 'Int':
                        target.value = isNaN(node.attributes[name].value) ? node.attributes[name].value : Number(node.attributes[name].value);
                        break;
                    case 'EnumMember':
                        target.value = enumValue(node.attributes[name].value);
                        break;
                    case 'UrlRef':
                        target.value = { $UrlRef: node.attributes[name].value };
                        break;
                    default:
                        console.log('Unexpected attribute: ' + name);
                        target['$' + name] = (node.attributes[name].value === "" || isNaN(node.attributes[name].value)) ? node.attributes[name].value : Number(node.attributes[name].value);
                }
            } else {
                // Note: need to pass Type before Nullable, Precision, and Scale
                if (name === 'Nullable' && !target.$Collection && node.local !== 'Singleton' && !(result.$Version < '4.0' && node.local == 'Parameter'))
                    target['$' + name] = true;
                else if (name === 'Scale' && (target.$Type === 'Edm.Decimal' || target.$UnderlyingType === 'Edm.Decimal') && node.local !== 'Cast' && node.local !== 'IsOf')
                    target['$' + name] = 0;
                else if (name === 'Precision' && ['Edm.DateTimeOffset', 'Edm.DateTime'].includes(target.$Type))
                    target['$' + name] = 0;
            }
        })
        if (node.local === 'NavigationProperty' && target.$Collection && target.$Nullable)
            delete target.$Nullable;
    }

    try {
        parser.write(xml).close();
    } catch (e) {
        e.parser = {
            construct: xml.toString().substring(parser.startTagPosition - 1, parser.position),
            line: parser.line + 1, // sax parser counts from zero, and people and most editors count from 1
            column: parser.column
        };
        throw e;
    }

    if (preV4.hasDocumentation && namespace['Org.OData.Core.V1'] === undefined) {
        if (!result.$Reference) result.$Reference = {};
        result.$Reference['https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json'] = {
            $Include: [
                { $Namespace: 'Org.OData.Core.V1' }
            ]
        };
    }


    return result;
}
