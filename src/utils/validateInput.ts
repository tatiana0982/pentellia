import z, { ZodSchema } from "zod";
import { ApiError } from "./ApiError";

export function validateInput<T>(
  schema: ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ApiError(400 ,"Validation Error",  result.error.format());
  }

  return result.data;
}
