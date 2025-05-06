export type Result<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

export const ok = <T>(data: T): Result<T> => ({
  success: true,
  data,
});

export const err = <E extends Error>(error: E): Result<never, E> => ({
  success: false,
  error,
});

export const match = <T, E extends Error, U>(
  result: Result<T, E>,
  options: {
    ok: (data: T) => U;
    err: (error: E) => U;
  }
): U => {
  if (result.success) {
    return options.ok(result.data);
  } else {
    return options.err(result.error);
  }
};
