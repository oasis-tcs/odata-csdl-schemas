/**
 * Converts OData CSDL XML 2.0 and 4.0x to OData CSDL JSON
*/

//TODO: normalize annotation targets

const sax = require('sax');

module.exports.xml2json = function (xml) {
    const result = {};
    const alias = { Edm: 'Edm', odata: 'odata' };
    //TODO: do we need this?
    const namespace = {};
    const namespaceUri = {};

    const preV4 = {
        association: {},
        associationSets: [],
        entitySet: {},
        current: {
            association: null,
            associationSet: null,
            namespace: null
        }
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
                //TODO: also check with alias-qualified name, two keys for same association object
                //TODO: wrap that in function getAssociation?
                preV4.current.association = preV4.association[name] || {}
                preV4.association[name] = preV4.current.association;
                break;
            }
            case 'NavigationProperty':
                if (result.$Version < '4.0') {
                    const name = node.attributes.Relationship.value;
                    //TODO: also check with alias-qualified name, two keys for same association object
                    //TODO: wrap that in function getAssociation?
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
                    const end = preV4.current.association[node.attributes.Role.value] || {};
                    end.type = normalizeTarget(node.attributes.Type.value);
                    end.mult = node.attributes.Multiplicity.value;
                    preV4.current.association[node.attributes.Role.value] = end;
                } else if (preV4.current.associationSet) {
                    preV4.current.associationSet.ends.push({
                        set: node.attributes.EntitySet.value,
                        role: node.attributes.Role.value
                    });
                }
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
        }
    }
    preParser.write(xml).close();

    preV4.associationSets.forEach(associationSet => {
        const assoc = preV4.association[associationSet.associationName];
        associationSet.ends.forEach((end, i) => {
            const other = associationSet.ends[1 - i];
            if (!preV4.entitySet.hasOwnProperty(end.set)) preV4.entitySet[end.set] = [];
            preV4.entitySet[end.set].push({
                path: assoc[end.role].$Partner,
                type: assoc[end.role].type,
                target: other.set
            });
        });
    });

    const current = { annotatable: [], annotation: [] };
    const parser = sax.parser(true, { xmlns: true });

    parser.onerror = function (e) {
        //TODO
        console.log(e);
    }

    parser.onopentag = function (node) {
        const attributeExpressions = [
            'Binary', 'Bool', 'Date', 'DateTimeOffset', 'Decimal', 'Duration', 'EnumMember', 'Float', 'Guid', 'Int', 'String', 'TimeOfDay',
            'AnnotationPath', 'ModelElementPath', 'NavigationPropertyPath', 'PropertyPath', 'Path', 'UrlRef'];
        //TODO: check node.uri for correct namespace(s) - helper function
        //TODO: check attributes to have no namespace
        let annotatable = { target: null, prefix: '', node: node }; //TODO: node only for debugging purposes
        let annotation = {};

        switch (node.local) {
            case 'Reference': {
                if (!result.hasOwnProperty('$Reference')) result.$Reference = {};
                current.reference = {};
                let uri = node.attributes.Uri.value;
                if (uri.startsWith('https://oasis-tcs.github.io/odata-vocabularies/vocabularies/') && uri.endsWith('.xml'))
                    uri = uri.substring(0, uri.length - 3) + 'json';
                result.$Reference[uri] = current.reference;
                annotatable.target = current.reference;
                break;
            }
            case 'Include':
                if (!current.reference.hasOwnProperty('$Include')) current.reference.$Include = [];
                current.include = {};
                setAttributes(current.include, node, ['Namespace', 'Alias']);
                current.reference.$Include.push(current.include);
                annotatable.target = current.include;
                break;
            case 'IncludeAnnotations':
                if (!current.reference.hasOwnProperty('$IncludeAnnotations')) current.reference.$IncludeAnnotations = [];
                current.includeAnnotations = {};
                setAttributes(current.includeAnnotations, node, ['TargetNamespace', 'TermNamespace', 'Qualifier']);
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
            case 'PropertyRef': {
                const attr = {};
                setAttributes(attr, node, ['Name', 'Alias']);
                if (attr.hasOwnProperty('$Alias')) {
                    const key = {};
                    key[attr.$Alias] = attr.$Name;
                    current.type.$Key.push(key)
                } else {
                    current.type.$Key.push(attr.$Name);
                }
                break;
            }
            case 'ComplexType':
                current.type = { $Kind: node.local };
                setAttributes(current.type, node, ['Abstract', 'BaseType', 'OpenType']);
                current.schema[node.attributes.Name.value] = current.type;
                annotatable.target = current.type;
                break;
            case 'NavigationProperty':
                current.property = { $Kind: node.local };
                if (result.$Version < '4.0') {
                    const association = preV4.association[node.attributes.Relationship.value];
                    const toEnd = association[node.attributes.ToRole.value];
                    current.property.$Type = toEnd.type;
                    if (toEnd.mult == '*') current.property.$Collection = true;
                    if (toEnd.mult == '0..1') current.property.$Nullable = true;
                    if (toEnd.$Partner) current.property.$Partner = toEnd.$Partner;
                } else {
                    setAttributes(current.property, node, ['Type', 'Nullable', 'ContainsTarget', 'Partner']);
                }
                current.type[node.attributes.Name.value] = current.property;
                annotatable.target = current.property;
                break;
            case 'OnDelete':
                current.property.$OnDelete = node.attributes.Action.value;
                annotatable.target = current.property;
                annotatable.prefix = '$OnDelete';
                break;
            case 'ReferentialConstraint':
                if (!current.property.hasOwnProperty('$ReferentialConstraint')) current.property.$ReferentialConstraint = {};
                current.property.$ReferentialConstraint[node.attributes.Property.value] = node.attributes.ReferencedProperty.value;
                annotatable.target = current.property.$ReferentialConstraint;
                annotatable.prefix = node.attributes.Property.value;
                break;
            case 'Property':
                current.property = {};
                setAttributes(current.property, node, ['Type', 'Nullable', 'MaxLength', 'Unicode', 'Precision', 'Scale', 'SRID', 'DefaultValue']);
                current.type[node.attributes.Name.value] = current.property;
                annotatable.target = current.property;
                break;
            case 'EnumType':
                current.type = { $Kind: node.local };
                current.enumMemberValue = 0;
                setAttributes(current.type, node, ['UnderlyingType', 'IsFlags']);
                current.schema[node.attributes.Name.value] = current.type;
                annotatable.target = current.type;
                break;
            case 'Member':
                current.type[node.attributes.Name.value] = Number(getAttribute(node, 'Value')) || current.enumMemberValue;
                current.enumMemberValue++;
                annotatable.target = current.type;
                annotatable.prefix = node.attributes.Name.value;
                break;
            case 'TypeDefinition':
                current.type = { $Kind: node.local };
                setAttributes(current.type, node, ['UnderlyingType', 'MaxLength', 'Unicode', 'Precision', 'Scale', 'SRID']);
                current.schema[node.attributes.Name.value] = current.type;
                annotatable.target = current.type;
                break;
            case 'Action':
                if (!current.schema.hasOwnProperty(node.attributes.Name.value)) current.schema[node.attributes.Name.value] = [];
                current.overload = { $Kind: node.local };
                setAttributes(current.overload, node, ['EntitySetPath', 'IsBound']);
                current.schema[node.attributes.Name.value].push(current.overload);
                annotatable.target = current.overload;
                break;
            case 'Function':
                if (!current.schema.hasOwnProperty(node.attributes.Name.value)) current.schema[node.attributes.Name.value] = [];
                current.overload = { $Kind: node.local };
                setAttributes(current.overload, node, ['EntitySetPath', 'IsBound', 'IsComposable']);
                current.schema[node.attributes.Name.value].push(current.overload);
                annotatable.target = current.overload;
                break;
            case 'Parameter': {
                if (!current.overload.hasOwnProperty('$Parameter')) current.overload.$Parameter = [];
                let parameter = { $Name: node.attributes.Name.value };
                setAttributes(parameter, node, ['Type', 'Nullable', 'MaxLength', 'Unicode', 'Precision', 'Scale', 'SRID']);
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
                if (bindings) {
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
                setAttributes(term, node, ['Type', 'Nullable', 'AppliesTo', 'BaseTerm', 'DefaultValue']);
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
            default:
        }

        current.annotatable.unshift(annotatable);
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
            case 'ValueAnnotation':
            case 'Annotation': {
                let annotation = current.annotation.shift();
                if (current.annotatable[1].target != null) {
                    const name = current.annotatable[1].prefix + '@' + normalizeTarget(annotation.$Term)
                        + (current.qualifier ? '#' + current.qualifier : '')
                        + (annotation.$Qualifier ? '#' + annotation.$Qualifier : '')
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
            case 'String':
            case 'TimeOfDay':
                updateValue(current.annotation[0], current.text);
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

        //TODO: normalize rest

        return path + args + rest;
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
            record['@type'] = (uri || '') + '#' + type;
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
                    case 'AppliesTo':
                        target['$' + name] = node.attributes[name].value.trim().replace(/\s+/g, ' ').split(' ');
                        break;
                    case 'DefaultValue': {
                        let value = node.attributes[name].value;
                        if (value === 'null')
                            target['$' + name] = null;
                        else if (value === 'true')
                            target['$' + name] = true;
                        else if (value === 'false')
                            target['$' + name] = false;
                        else target['$' + name] = isNaN(node.attributes[name].value) ? node.attributes[name].value : Number(node.attributes[name].value);
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
                    case 'Version':
                        target['$' + name] = node.attributes[name].value;
                        break;
                    case 'AnnotationPath':
                    case 'ModelElementPath':
                    case 'NavigationPropertyPath':
                    case 'PropertyPath':
                        target.value = normalizePath(node.attributes[name].value);
                        break;
                    case 'Path':
                        target.value = { $Path: normalizePath(node.attributes[name].value) };
                        break;
                    case 'Binary':
                    case 'Date':
                    case 'DateTimeOffset':
                    case 'Duration':
                    case 'Guid':
                    case 'String':
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
                        //console.log('attribute default: ' + name);
                        target['$' + name] = isNaN(node.attributes[name].value) ? node.attributes[name].value : Number(node.attributes[name].value);
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

    parser.write(xml).close();

    return result;
}