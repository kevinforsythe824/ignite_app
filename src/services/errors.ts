/** Thrown by service stubs until a real implementation is wired. */
export class ServiceNotConnectedError extends Error {
  readonly service: string;
  readonly method: string;

  constructor(service: string, method: string) {
    super(`${service}.${method} is not connected yet`);
    this.name = 'ServiceNotConnectedError';
    this.service = service;
    this.method = method;
  }
}

export function notConnected(service: string, method: string): never {
  throw new ServiceNotConnectedError(service, method);
}
