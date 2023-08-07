import BrowserRuntime from '../BrowserRuntime';
import _webpack from 'webpack';


export default function PublicPathRuntimeModule(webpack: typeof _webpack, acceptWeak: boolean) {
    const { RuntimeGlobals, RuntimeModule, Template } = webpack

    class PublicPathRuntimeModule extends RuntimeModule {
        constructor() {
            super('publicPath', RuntimeModule.STAGE_BASIC)
        }
        /**
         * @returns {string} runtime code
         */
        generate() {
            const { compilation } = this
            if (!compilation)
                return Template.asString(
                    '/* [webpack-target-webextension] PublicPathRuntimeModule skipped because no compilation is found. */'
                )
            const { publicPath } = compilation.outputOptions

            return Template.asString([
                ...BrowserRuntime(acceptWeak),
                `var path = ${JSON.stringify(
                    compilation.getPath(publicPath || '', {
                        hash: compilation.hash || 'XXXX',
                    })
                )}`,
                `${RuntimeGlobals.publicPath} = typeof importScripts === 'function' ? path : runtime.runtime.getURL(path);`,
            ])
        }
    }

    return new PublicPathRuntimeModule()
}
