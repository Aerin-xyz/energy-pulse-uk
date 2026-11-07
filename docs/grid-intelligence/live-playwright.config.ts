import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'../../tests',timeout:60000,workers:2,use:{baseURL:'https://energymix.info',headless:true},reporter:'list',outputDir:'/tmp/energy-grid-phase0-playwright'});
