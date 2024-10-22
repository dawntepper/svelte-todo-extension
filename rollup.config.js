import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';
import copy from 'rollup-plugin-copy';
import postcss from 'rollup-plugin-postcss';

const production = !process.env.ROLLUP_WATCH;

function serve() {
    let server;

    function toExit() {
        if (server) server.kill(0);
    }

    return {
        writeBundle() {
            if (server) return;
            server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
                stdio: ['ignore', 'inherit', 'inherit'],
                shell: true
            });

            process.on('SIGTERM', toExit);
            process.on('exit', toExit);
        }
    };
}

export default {
    input: 'src/main.js',
    output: {
        sourcemap: true,
        format: 'iife',
        name: 'app',
        file: 'dist/build/bundle.js'
    },
    plugins: [
        svelte({
            preprocess: sveltePreprocess({ 
                sourceMap: !production,
                postcss: true
            }),
            compilerOptions: {
                dev: !production
            }
        }),
        postcss({
            extract: 'bundle.css',
            minimize: production,
            use: [
                ['sass', {
                    includePaths: ['./src/theme', './node_modules']
                }]
            ]
        }),
        copy({
            targets: [
                { src: 'src/index.html', dest: 'dist' },
                { src: 'src/manifest.json', dest: 'dist' },
                { src: 'src/*.png', dest: 'dist' }
            ]
        }),
        resolve({
            browser: true,
            dedupe: ['svelte']
        }),
        commonjs(),
        typescript({
            sourceMap: !production,
            inlineSources: !production
        }),
        !production && serve(),
        !production && livereload('dist'),
        production && terser()
    ],
    watch: {
        clearScreen: false
    }
};