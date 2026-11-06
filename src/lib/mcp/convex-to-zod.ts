import type {
  GenericValidator,
  Infer,
  PropertyValidators,
} from "convex/values";
import { z } from "zod";

type NestedFields<V> = V extends {
  kind: "object";
  fields: infer F;
}
  ? F
  : V extends {
        kind: "array";
        element: infer E;
      }
    ? NestedFields<E>
    : V extends {
          kind: "union";
          members: readonly (infer M)[];
        }
      ? NestedFields<M>
      : never;

type KeysOfUnion<T> = T extends unknown ? keyof T : never;

type FieldOf<T, K extends PropertyKey> =
  T extends Record<K, infer V> ? V : never;

type FieldDoc<V> = [
  NestedFields<V>,
] extends [
  never,
]
  ? string | ScalarOverride
  : {
      about?: string;
      fields: FieldDocs<NestedFields<V>>;
    };

type ScalarOverride = {
  about: string;
  schema: z.ZodType;
};

export type FieldDocs<F> = {
  [K in KeysOfUnion<F>]: FieldDoc<FieldOf<F, K>>;
};

type RuntimeDoc =
  | string
  | {
      about?: string;
      fields?: RuntimeDocs;
      schema?: z.ZodType;
    };

type RuntimeDocs = Record<string, RuntimeDoc | undefined>;

function toZod(validator: GenericValidator, doc?: RuntimeDoc): z.ZodType {
  const about = typeof doc === "string" ? doc : doc?.about;
  const fields = typeof doc === "string" ? undefined : doc?.fields;
  const override = typeof doc === "string" ? undefined : doc?.schema;
  const schema = override ?? toRequiredZod(validator, fields);
  const described = about ? schema.describe(about) : schema;

  return validator.isOptional === "optional" ? described.optional() : described;
}

function toShape(fields: PropertyValidators, docs?: RuntimeDocs) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, validator]) => [
      key,
      toZod(validator, docs?.[key]),
    ]),
  );
}

function toRequiredZod(
  validator: GenericValidator,
  fields?: RuntimeDocs,
): z.ZodType {
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
      return z.array(
        toZod(validator.element, {
          fields,
        }),
      );
    case "object":
      return z.object(toShape(validator.fields, fields));
    case "record":
      return z.record(z.string(), toZod(validator.value));
    case "union": {
      const [first, second, ...rest] = validator.members.map((member) =>
        toZod(member, {
          fields,
        }),
      );
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
  docs: FieldDocs<C>,
): { [K in keyof C]: z.ZodType<Infer<C[K]>> } {
  return toShape(fields, docs as unknown as RuntimeDocs) as {
    [K in keyof C]: z.ZodType<Infer<C[K]>>;
  };
}
