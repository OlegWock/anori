import LoadScriptRuntimeModule from './RuntimeModules/LoadScript';
import PublicPathRuntimeModule from './RuntimeModules/PublicPath';
import AutoPublicPathRuntimeModule from './RuntimeModules/AutoPublicPath';
import EagerlyLoadChunksRuntimeModule from './RuntimeModules/EagerlyLoadChunks';
import { Compiler, Compilation } from 'webpack';

export type WebExtImportPluginOptions = {
    backgroundWorkerEntry?: string,
};
type MapValue<T> = T extends Map<any, infer R> ? R : never;
type Entrypoint = MapValue<Compilation["entrypoints"]>;
type Chunkgroup = ReturnType<MapValue<Compilation["entrypoints"]>["getChildren"]>[number];

export default class WebExtensionChuckLoaderRuntimePlugin {
    options: WebExtImportPluginOptions;
    weakRuntimeCheck: boolean;

    constructor(options: WebExtImportPluginOptions) {
        this.options = options;
        this.weakRuntimeCheck = false;
    }

    apply(compiler: Compiler) {
        const { RuntimeGlobals } = compiler.webpack;
        const { options } = this;

        compiler.hooks.compilation.tap(WebExtensionChuckLoaderRuntimePlugin.name, (compilation) => {

            compilation.hooks.runtimeRequirementInTree
                .for(RuntimeGlobals.loadScript)
                .tap(WebExtensionChuckLoaderRuntimePlugin.name, (chunk) => {
                    compilation.addRuntimeModule(
                        chunk,
                        LoadScriptRuntimeModule(
                            compiler.webpack,
                            compilation.outputOptions.environment && compilation.outputOptions.environment.dynamicImport,
                            this.weakRuntimeCheck,
                            RuntimeGlobals.loadScript,
                        )
                    );
                    return true;
                });

            compilation.hooks.runtimeRequirementInTree
                .for(RuntimeGlobals.publicPath)
                .tap(WebExtensionChuckLoaderRuntimePlugin.name, (chunk, set) => {
                    const { outputOptions } = compilation;
                    const { publicPath, scriptType } = outputOptions;

                    if (publicPath === 'auto') {
                        const module = AutoPublicPathRuntimeModule(compiler.webpack, this.weakRuntimeCheck);
                        if (scriptType !== 'module') set.add(RuntimeGlobals.global);
                        compilation.addRuntimeModule(chunk, module);
                    } else {
                        const module = PublicPathRuntimeModule(compiler.webpack, this.weakRuntimeCheck);

                        if (typeof publicPath !== 'string' || /\[(full)?hash\]/.test(publicPath)) {
                            module.fullHash = true;
                        }

                        compilation.addRuntimeModule(chunk, module);
                    }
                    return true;
                });

            compilation.hooks.runtimeRequirementInTree
                .for(RuntimeGlobals.require)
                .tap(WebExtensionChuckLoaderRuntimePlugin.name, (chunk, set) => {
                    set.add(RuntimeGlobals.ensureChunkHandlers);
                    set.add(RuntimeGlobals.ensureChunkIncludeEntries);
                });

            compilation.hooks.afterOptimizeChunkIds.tap(WebExtensionChuckLoaderRuntimePlugin.name, () => {
                compilation.entrypoints.forEach(entryPoint => {
                    // console.log('Processing entry point', { id: entryPoint.id, name: entryPoint.name });
                    if (this.options.backgroundWorkerEntry && this.options.backgroundWorkerEntry === entryPoint.name) {
                        // Background worker will be handled by ServiceWorkerEntryPlugin plugin
                        return;
                    }
                    const visitedChunkGroups = new Set()
                    const initialChunks = new Set(entryPoint.chunks)
                    collectAllChildren(entryPoint);

                    if (initialChunks.size) {
                        compilation.addRuntimeModule(
                            entryPoint.getEntrypointChunk(),
                            EagerlyLoadChunksRuntimeModule(compiler.webpack, compilation, [...initialChunks].map(x => x.id))
                        );
                    }
                    function collectAllChildren(chunkGroup: Entrypoint | Chunkgroup) {
                        for (const x of chunkGroup.getChildren()) {
                            if (visitedChunkGroups.has(x)) continue
                            else {
                                visitedChunkGroups.add(x)
                                x.chunks.forEach(x => {
                                    if (x.canBeInitial()) initialChunks.add(x);
                                })
                                collectAllChildren(x)
                            }
                        }
                    }
                });

            });
        })
    }
}
