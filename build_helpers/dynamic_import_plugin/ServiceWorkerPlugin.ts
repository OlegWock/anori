import { Compiler, Compilation } from 'webpack';
import EagerlyLoadChunksRuntimeModule from './RuntimeModules/EagerlyLoadChunks';

type MapValue<T> = T extends Map<any, infer R> ? R : never;
type Entrypoint = MapValue<Compilation["entrypoints"]>;
type Chunkgroup = ReturnType<MapValue<Compilation["entrypoints"]>["getChildren"]>[number];

export default class ServiceWorkerEntryPlugin {
    entry: string;
    options: {};

    constructor(options: {}, entry: string) {
        this.options = options;
        this.entry = entry;
    }

    apply(compiler: Compiler) {
        const hook = compiler.hooks.entryOption
        // Set chunkLoading to import-scripts
        // @ts-ignore DO NOT add return boolean to this function, this is a BailHook and we don't want to bail.
        hook.tap(ServiceWorkerEntryPlugin.name, (context, entries) => {
            if (typeof entries === 'function') {
                console.warn(`[webpack-extension-target] Dynamic entry points not supported yet.
You must manually set the chuck loading of entry point ${this.entry} to "import-scripts".

See https://webpack.js.org/configuration/entry-context/#entry-descriptor

Set background.noWarningDynamicEntry to true to disable this warning.
`)
            }
            // @ts-ignore incorrect types idk
            const selectedEntry = entries[this.entry]
            if (!selectedEntry) throw new Error(`[webpack-extension-target] There is no entry called ${this.entry}.`)
            selectedEntry.chunkLoading = 'import-scripts'
        })

        // Set all lazy chunks to eagerly loaded
        // See https://bugs.chromium.org/p/chromium/issues/detail?id=1198822
        compiler.hooks.compilation.tap(ServiceWorkerEntryPlugin.name, (compilation) => {
            compilation.hooks.afterOptimizeChunkIds.tap(ServiceWorkerEntryPlugin.name, () => {
                const entryPoint = compilation.entrypoints.get(this.entry)
                if (!entryPoint) return

                const children = entryPoint.getChildren()
                const visitedChunkGroups = new Set()
                const reachableChunks = new Set(entryPoint.chunks)
                collectAllChildren(entryPoint)

                if (reachableChunks.size) {
                    compilation.addRuntimeModule(
                        entryPoint.getEntrypointChunk(),
                        EagerlyLoadChunksRuntimeModule(compiler.webpack, compilation, [...reachableChunks].map(x => x.id))
                    )
                }
                function collectAllChildren(chunkGroup: Entrypoint | Chunkgroup) {
                    for (const x of chunkGroup.getChildren()) {
                        if (visitedChunkGroups.has(x)) continue
                        else {
                            visitedChunkGroups.add(x)
                            x.chunks.forEach(x => reachableChunks.add(x))
                            collectAllChildren(x)
                        }
                    }
                }
            })
        })
    }
}
