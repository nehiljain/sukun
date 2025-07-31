import React from "react";
import { z } from "zod";

interface PropertyControlsGeneratorProps {
  schema: z.ZodObject<any>;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export const PropertyControlsGenerator: React.FC<
  PropertyControlsGeneratorProps
> = ({ schema, values, onChange }) => {
  // Get the shape of the schema
  const shape = schema._def.shape();

  return (
    <div className="space-y-4">
      {Object.entries(shape).map(([key, field]) => {
        // Skip internal fields or fields marked as hidden
        if (key.startsWith("_") || (field as any)._def.hidden) {
          return null;
        }

        return (
          <div key={key} className="mb-4">
            <label className="block text-muted-foreground text-xs mb-2">
              {key.charAt(0).toUpperCase() +
                key.slice(1).replace(/([A-Z])/g, " $1")}
            </label>

            {renderControlForField(field, values[key], (newValue) =>
              onChange(key, newValue),
            )}
          </div>
        );
      })}
    </div>
  );
};

// Helper function to render the appropriate control based on field type
function renderControlForField(
  field: z.ZodTypeAny,
  value: any,
  onChange: (value: any) => void,
) {
  // String field
  if (field instanceof z.ZodString) {
    return (
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-input text-foreground px-2 py-1 rounded-md"
      />
    );
  }

  // Number field
  if (field instanceof z.ZodNumber) {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-input text-foreground px-2 py-1 rounded-md"
      />
    );
  }

  // Boolean field
  if (field instanceof z.ZodBoolean) {
    return (
      <div className="flex items-center">
        <input
          type="checkbox"
          id={`field-${Math.random()}`}
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="mr-2"
        />
      </div>
    );
  }

  // Color field (assuming string fields with "color" in the name are colors)
  if (
    field instanceof z.ZodString &&
    field._def.description?.includes("color")
  ) {
    return (
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="block w-16 h-8 rounded-md"
      />
    );
  }

  // Enum field
  if (field instanceof z.ZodEnum) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-input text-foreground px-2 py-1 rounded-md"
      >
        {field._def.values.map((option: string) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  // Add more field types as needed

  // Default fallback
  return (
    <div className="text-xs text-muted-foreground">Unsupported field type</div>
  );
}
