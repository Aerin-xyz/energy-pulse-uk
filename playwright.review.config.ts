import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'**/*.spec.ts',timeout:60000,workers:3,outputDir:'test-results-review',use:{baseURL:process.env.REVIEW_URL||'http://127.0.0.1:4175',screenshot:'only-on-failure',trace:'retain-on-failure'},reporter:[['list'],['json',{outputFile:'docs/atlas-ux-review/results/regression.json'}]]});
