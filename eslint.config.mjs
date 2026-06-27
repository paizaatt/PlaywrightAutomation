import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Cấu hình bỏ qua các thư mục không cần soi code
    ignores: [
      "node_modules/", 
      "playwright-report/", 
      "test-results/", 
      "**/*.config.ts"
    ]
  },
  {
    // Các luật lệ ép chuẩn code
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
);