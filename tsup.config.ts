import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  minify: true,
  target: 'es2020',
  // Let CommonJS users call require('humanbytes')(1536) directly.
  footer: ({ format }) =>
    format === 'cjs' ? { js: 'var __d=module.exports.default;for(var __k in module.exports)if(!(__k in __d))__d[__k]=module.exports[__k];__d.default=__d;module.exports=__d;' } : {},
});
