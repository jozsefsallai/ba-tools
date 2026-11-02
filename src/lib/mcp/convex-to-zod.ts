import type {
  GenericValidator,
  Infer,
  PropertyValidators,
} from "convex/values";
import { z } from "zod";

function toZod(validator: GenericValidator): z.ZodType {
  const schema = toRequiredZod(validator);
  return validator.isOptional === "optional" ? schema.optional() : schema;
}

function toRequiredZod(validator: GenericValidator): z.ZodType {
  switch (validator.kind) {
    case "id":
      return z.string().describe(`A \`${validator.tableName}\` id.`);
    case "string":
      return z.string();
    case "float64":
      return z.number();
    case "int64":
      return z.bigint();
    case "boolean":
      return z.boolean();
    case "null":
      return z.null();
    case "any":
      return z.any();
    case "literal":
      return z.literal(validator.value as string | number | boolean);
    case "array":
      return z.array(toZod(validator.element));
    case "object":
      return z.object(convexToZodShape(validator.fields));
    case "record":
      return z.record(z.string(), toZod(validator.value));
    case "union": {
      const [first, second, ...rest] = validator.members.map(toZod);
      return second
        ? z.union([
            first,
            second,
            ...rest,
          ])
        : first;
    }
    default:
      throw new Error(`Unsupported Convex validator: ${validator.kind}`);
  }
}

export function convexToZodShape<C extends PropertyValidators>(
  fields: C,
): { [K in keyof C]: z.ZodType<Infer<C[K]>> } {
  return Object.fromEntries(
    Object.entries(fields).map(([key, validator]) => [
      key,
      toZod(validator),
    ]),
  ) as { [K in keyof C]: z.ZodType<Infer<C[K]>> };
}
