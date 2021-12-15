import { CodeBlockWriter } from 'ts-morph';
import { ApiEndpoint, ApiEndpointParams, HttpVerb } from './types';

/**
 * Interpolates the path with the given params,
 * e.g. '/orders/:orderId' becomes `/orders/${orderId}`
 *
 * @param path
 * @param params
 * @returns
 */
const interpolateParams = (path: string, params?: ApiEndpointParams) => {
    return params
        ? Object.entries(params).reduce((acc, [name]) => {
              return acc.replace(`:${name}`, `\$\{${name}\}`);
          }, path)
        : path;
};

const writeEndpoint = (writer: CodeBlockWriter, endpoint: ApiEndpoint) => {
    const unrollParams = (params?: ApiEndpointParams) => [
        ...Object.entries(params || {}).map(([name, { type }]) => {
            return `${name}: ${type}`;
        }),
    ];
    const functionParams = [
        ...unrollParams(endpoint.params),
        ...unrollParams(endpoint.body),
        ...unrollParams(endpoint.query), // todo: check if optional
    ];
    writer
        // export const getOrder = async (orderId: string): Promise<Order> =>
        .write(`export const ${endpoint.functionName} = (${functionParams.join(', ')}): Promise<${endpoint.returnType}> =>`)
        .block(() => {
            writer
                // return client.get<Order>(`/orders/${orderId}`
                .write(
                    `return client.${endpoint.method.toLowerCase()}<${endpoint.returnType}>(\`${interpolateParams(
                        endpoint.path,
                        endpoint.params
                    )}\``
                )
                .conditionalWrite(
                    [HttpVerb.Post, HttpVerb.Put, HttpVerb.Patch].includes(endpoint.method) &&
                        !!endpoint.body &&
                        Object.keys(endpoint.body).length > 0,
                    `, { ${Object.entries(endpoint.body || {})
                        .map(([name, { spread }]) => `${spread ? '...' : ''}${name}`)
                        .join(', ')} }`
                )
                .conditionalWrite(
                    !!endpoint.query && Object.keys(endpoint.query).length > 0,
                    `, { params: { ${Object.entries(endpoint.query || {})
                        .map(([name, { spread }]) => `${spread ? '...' : ''}${name}`)
                        .join(', ')} } }`
                )
                .write(`).then((res) => res.data);`);
        });
};

export const generateClient = (endpoints: ApiEndpoint[]) => (writer: CodeBlockWriter) => {
    writer.writeLine('/**');
    writer.writeLine('* This file is generated automatically. It should not be modified directly.');
    writer.writeLine('*/');
    writer.blankLine();
    for (const endpoint of endpoints) {
        writeEndpoint(writer, endpoint);
        writer.blankLine();
    }
    writer.blankLine();
};
