export enum HttpVerb {
    Get = 'GET',
    Post = 'POST',
    Put = 'PUT',
    Delete = 'DELETE',
    Patch = 'PATCH',
}

export type ApiEndpointParams = Record<string, { type: string; spread: boolean }>;

export type ApiEndpointParamFields = { params?: ApiEndpointParams; body?: ApiEndpointParams; query?: ApiEndpointParams };

export type ApiEndpoint = ApiEndpointParamFields & {
    functionName: string; // 'getOrder'
    method: HttpVerb;
    path: string; // '/orders/:orderId',
    returnType?: string;
};

export type ApiEndpoints = Record<string, ApiEndpoint[]>;
