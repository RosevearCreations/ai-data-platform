import {
  applyRecipeTransforms,
  parseVisualRecipe,
  recipeCanSave,
  recipeSourceOrigin,
  validateVisualRecipe,
  type VisualExtractionRecipe
} from "../lib/visual-recipe-builder";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const recipe = parseVisualRecipe({
  version: 1,
  name: " Product cards ",
  sourceUrl: "https://Example.com/products",
  recordSelector: ".product",
  fields: [
    {
      id: "name",
      key: " Product Name ",
      label: " Product name ",
      selector: "h2",
      source: "text",
      attribute: "",
      required: true,
      transforms: ["trim", "collapse-whitespace"]
    },
    {
      id: "price",
      key: "price",
      label: "Price",
      selector: ".price",
      source: "text",
      attribute: "",
      required: false,
      transforms: ["trim", "currency"]
    }
  ]
});
assert(recipe.name === "Product cards", "Recipe name must normalize.");
assert(recipe.sourceUrl === "https://example.com/products", "Recipe source URL must normalize.");
assert(recipeSourceOrigin(recipe.sourceUrl) === "https://example.com", "Recipe source origin must normalize.");
assert(recipe.fields[0]?.key === "product_name", "Field keys must normalize.");
assert(recipeCanSave(recipe), "Valid recipe must be saveable.");
assert(applyRecipeTransforms("  $1,234.50 ", ["trim", "currency"]) === 1234.5,
  "Currency transform must produce a deterministic number.");

const duplicate: VisualExtractionRecipe = {
  ...recipe,
  fields: [
    recipe.fields[0],
    { ...recipe.fields[1], key: recipe.fields[0].key }
  ]
};
assert(
  validateVisualRecipe(duplicate).some((issue) => issue.code === "duplicate-field-key"),
  "Duplicate field keys must fail validation."
);

const attributeMissing: VisualExtractionRecipe = {
  ...recipe,
  fields: [{ ...recipe.fields[0], source: "attribute", attribute: "" }]
};
assert(
  validateVisualRecipe(attributeMissing).some((issue) => issue.code === "attribute-required"),
  "Attribute extraction must require an attribute name."
);

let badUrl = false;
try {
  parseVisualRecipe({ ...recipe, sourceUrl: "javascript:alert(1)" });
} catch {
  badUrl = true;
}
assert(badUrl, "Non-http(s) source URLs must fail closed.");

console.log("Build 046 recipe parsing, validation, URL safety and transforms passed.");
