import { ClassDeclaration, Decorator, Project, SourceFile, SyntaxKind } from 'ts-morph';
import { ApiEndpoint } from '../types';
import { notEmpty } from '../utils';
import { isHttpMethod, parseHttpCtrlMethod } from './method';

const getControllerDecorator = (classDeclaration: ClassDeclaration): Decorator | undefined => {
    return classDeclaration.getDecorators().find(decorator => decorator.getName() === 'Controller');
};

const getRoutePrefix = (classDeclaration: ClassDeclaration): string | undefined => {
    const ctrlDecorator = getControllerDecorator(classDeclaration);
    return ctrlDecorator?.getFirstDescendantByKind(SyntaxKind.StringLiteral)?.getText();
};

const parseControllerClass = (classDeclaration: ClassDeclaration): ApiEndpoint[] => {
    const routePrefix = getRoutePrefix(classDeclaration);
    return classDeclaration
        .getMethods()
        .filter(isHttpMethod)
        .map(method => parseHttpCtrlMethod(method, routePrefix))
        .filter(notEmpty);
};

const isControllerClass = (classDeclaration: ClassDeclaration): boolean => getControllerDecorator(classDeclaration) != null;

const parseSourceFile = (file: SourceFile): ApiEndpoint[] =>
    file
        .getClasses()
        .filter(isControllerClass)
        .map(parseControllerClass)
        .flat();

export const parseProject = (project: Project): ApiEndpoint[] => {
    return project
        .getSourceFiles()
        .map(parseSourceFile)
        .flat();
};
