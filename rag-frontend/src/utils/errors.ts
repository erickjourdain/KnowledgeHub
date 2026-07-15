export class AppError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function isAppError(error: any): error is AppError {
  return error instanceof AppError || (error && typeof error === 'object' && 'status' in error && error.name === 'AppError');
}
