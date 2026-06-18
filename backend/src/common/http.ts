export interface DataResponse<T> {
  data: T;
}

export interface ListResponse<T> {
  data: T[];
  meta: {
    total?: number;
    nextCursor: string | null;
  };
}

export function dataResponse<T>(data: T): DataResponse<T> {
  return { data };
}
