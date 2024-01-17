export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export interface CommandWithParams {
  command: string;
  params?: string[];
}
