import _webpack from 'webpack';
import BrowserRuntime from '../BrowserRuntime'

// import()
const DYNAMIC_IMPORT_LOADER = 'dynamicImportLoader'
// createElement('script')
const DOM_LOADER = 'scriptLoader'
// importScripts
const WORKER_LOADER = 'workerLoader'
// browser.runtime.sendMessage()
const CLASSIC_LOADER = 'classicLoader'
// fallback choice when DYNAMIC_IMPORT_LOADER fails
const FALLBACK_LOADER = 'fallbackLoader'


export default function LoadScriptRuntimeModule(webpack: typeof _webpack, supportDynamicImport: boolean | undefined, acceptWeak: boolean, toDefine: string) {
    const { Template, RuntimeGlobals, RuntimeModule } = webpack;

    class LoadScriptRuntimeModule extends RuntimeModule {

        supportDynamicImport: boolean;

        constructor() {
            super('load script');
            this.supportDynamicImport = Boolean(supportDynamicImport);
        }

        f(args: string, body: string[]) {
            if (!this.compilation) throw new TypeError('No compilation is found.');
            return this.compilation.runtimeTemplate.basicFunction(args, body);
        }

        generate(): string {
            const DynamicImportLoader =
                `var ${DYNAMIC_IMPORT_LOADER} = ` +
                this.f('url, done, chunkId', [
                    `import(url).then(() => done(), ${this.f('e', [
                        `console.warn('jsonp chunk loader failed to use dynamic import.', e)`,
                        `${FALLBACK_LOADER}(url, done, chunkId)`,
                    ])})`,
                ])
            const DOMLoader =
                `var ${DOM_LOADER} = ` +
                this.f('url, done, chunkId', [
                    `var script = document.createElement('script')`,
                    `script.src = url`,
                    `script.onload = done`,
                    `script.onerror = done`,
                    `document.body.appendChild(script)`,
                ])
            const WorkerLoader =
                `var ${WORKER_LOADER} = ` +
                this.f('url, done, chunkId', [`try { importScripts(url); done() } catch (e) { done(e) }`])

            const ClassicLoaderDisabled =
                `var ${CLASSIC_LOADER} = ` +
                this.f('', [
                    'throw new Error("No loader for content script is found. You must set output.environment.dynamicImport to enable ES Module loader, or specify the background entry in your webpack config to enable the classic loader.")',
                ])
            return Template.asString(
                [
                    ...BrowserRuntime(acceptWeak),

                    ClassicLoaderDisabled,

                    this.supportDynamicImport ? DynamicImportLoader : '',

                    DOMLoader,
                    WorkerLoader,

                    `var isWorker = typeof importScripts === 'function'`,
                    // extension page
                    `if (typeof location === 'object' && location.protocol.includes('-extension:')) ${toDefine} = isWorker ? ${WORKER_LOADER} : ${DOM_LOADER}`,
                    // content script
                    `else if (!isWorker) ${toDefine} = ${CLASSIC_LOADER}`,
                    // worker in content script
                    `else { throw new TypeError('Unable to determinate the chunk loader: content script + Worker') }`,

                    this.supportDynamicImport ? `var ${FALLBACK_LOADER} = ${toDefine}` : '',
                    this.supportDynamicImport ? `${toDefine} = ${DYNAMIC_IMPORT_LOADER}` : '',
                ].filter(Boolean)
            )
        }
    }
    return new LoadScriptRuntimeModule();
}
