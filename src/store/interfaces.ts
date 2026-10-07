export type ActionTypeGenerator<T, P = void> = P extends void
  ? { type: T; payload?: undefined }
  : { type: T; payload: P };
