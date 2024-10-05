// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: [
			"src/**/*.ts"
		],
		ignores: [
			"dist",
			"build",
			"node_modules"
		],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-namespace": "off"
		}
	}
);