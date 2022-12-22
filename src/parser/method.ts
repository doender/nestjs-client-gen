import { Decorator, MethodDeclaration, SyntaxKind } from 'ts-morph';
import { ApiEndpoint, ApiEndpointParamFields, HttpVerb } from '../types';
import { notEmpty } from '../utils';

type HttpVerbDecorator = 'Get' | 'Post' | 'Put' | 'Delete' | 'Patch';

const httpVerbDecorators: Record<HttpVerbDecorator, HttpVerb> = {
    Get: HttpVerb.Get,
    Post: HttpVerb.Post,
    Put: HttpVerb.Put,
    Delete: HttpVerb.Delete,
    Patch: HttpVerb.Patch,
};

export const isHttpMethod = (method: MethodDeclaration): boolean => {
    return getHttpMethodDecorator(method) != null;
};

const isHttpMethodDecorator = (decorator: Decorator): boolean => {
    const decoratorName = decorator.getName() as HttpVerbDecorator;
    return Object.keys(httpVerbDecorators).includes(decoratorName);
};

const getHttpMethodDecorator = (method: MethodDeclaration): Decorator | undefined => {
    return method.getDecorators().find(isHttpMethodDecorator);
};

const getHttpMethodFromDecorator = (httpDecorator: Decorator): HttpVerb => {
    const decoratorName = httpDecorator.getName() as HttpVerbDecorator;
    return httpVerbDecorators[decoratorName];
};

const getFullPath = (httpDecorator: Decorator, pathPrefix?: string): string => {
    const subpath = httpDecorator.getFirstDescendantByKind(SyntaxKind.StringLiteral)?.getText();
    return (
        '/' +
        [pathPrefix, subpath]
            .filter(notEmpty)
            .map(s => s.replace(/'/g, ''))
            .join('/')
    );
};

// Remove import prefix if it is there
//https://github.com/dsherret/ts-morph/issues/450
const removeImportFromType = (type: string): string => type.replace(/import\(.*\)\./, '');

const getMethodReturnType = (method: MethodDeclaration): string => {
    let returnType = method.getReturnType()?.getText();
    returnType = removeImportFromType(returnType);

    // Get wrapped type out of promise
    const promiseMatch = returnType.match(/Promise<(.*)>/);
    if (promiseMatch) {
        returnType = promiseMatch[1];
    }
    return returnType;
};

const getMethodParams = (method: MethodDeclaration): ApiEndpointParamFields => {
    const paramFields: ApiEndpointParamFields = {};

    for (const param of method.getParameters()) {
        let type = param.getType().getText();
        type = removeImportFromType(type);

        const decorators = param
            .getDecorators()
            .map(decorator => ({ name: decorator.getName(), spread: decorator.getArguments().length == 0 }));

        const paramName = param.getName();
        const decoratorToKey: Record<string, keyof ApiEndpointParamFields> = {
            Body: 'body',
            Query: 'query',
            Param: 'params',
        };

        for (const { name, spread } of decorators) {
            // **ugly** super-special case for pagination
            if (name === 'Pagination') {
                paramFields['query'] = {
                    ...paramFields['query'],
                    pagination: { type: 'PaginateOptions', spread: true, optional: true },
                };
                continue;
            }

            const key = decoratorToKey[name];
            if (!key) continue;
            paramFields[key] = { ...paramFields[key], [paramName]: { type, spread, optional: false } };
        }
    }

    return paramFields;
};

export const parseHttpCtrlMethod = (method: MethodDeclaration, pathPrefix?: string): ApiEndpoint | undefined => {
    const httpMethodDecorator = getHttpMethodDecorator(method);
    if (httpMethodDecorator == null) return;
    return {
        functionName: method.getName(),
        method: getHttpMethodFromDecorator(httpMethodDecorator),
        path: getFullPath(httpMethodDecorator, pathPrefix),
        returnType: getMethodReturnType(method),
        ...getMethodParams(method),
    };
};
