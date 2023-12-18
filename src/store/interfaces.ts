export interface ActionTypeGenerator<T, P = void> {
  type: T;
  payload?: any;
}
