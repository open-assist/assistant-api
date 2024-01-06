export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: object[];
}

/**
 * status: 401
 */
export class UnauthorizedError extends Error {
}

/**
 * status: 404
 */
export class NotFoundError extends Error {
  instance: string | undefined = undefined;

  constructor(message?: string, options?: ErrorOptions, instance?: string) {
    super(message, options);
    this.message = message || "Not Found";
    this.instance = instance;
  }
}

/**
 * status: 422
 */
export class ValidationError extends Error {
  errors: object[] | undefined = [];

  constructor(message?: string, options?: ErrorOptions, errors?: object[]) {
    super(message, options);
    this.message = message || "Unprocessable Content";
    this.errors = errors;
  }
}
export class UnprocessableContent extends Error {
  errors: object[] | undefined = [];

  constructor(message?: string, options?: ErrorOptions, errors?: object[]) {
    super(message, options);
    this.message = message || "Unprocessable Content";
    this.errors = errors;
  }
}

/**
 * status: 429
 */
export class TooManyRequests extends Error {}

/**
 * status: 500
 */
export class InternalServerError extends Error {
}

export class DbCommitError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.message = message || "Database Commit Error";
    this.cause = options?.cause || "Commit failed, try again later.";
  }
}

export class ServerError extends Error {}

export class RateLimitExceeded extends Error {}
