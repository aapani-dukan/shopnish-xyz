{
  "compilerOptions": {
    // ... अन्य विकल्प ...
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@shared/*": ["../shared/*"],
      // नया एलियास जोड़ें
      "@/shared/types/auth": ["../shared/types/auth.ts"]
    }
    // ... अन्य विकल्प ...
  },
  "include": ["server/**/*.ts", "shared/**/*.ts"], // सुनिश्चित करें कि shared फ़ाइलें शामिल हैं
  "exclude": ["node_modules"]
}
