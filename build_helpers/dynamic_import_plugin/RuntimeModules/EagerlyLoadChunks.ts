import _webpack from 'webpack';

export default function EagerlyLoadChunksRuntimeModule(webpack: typeof _webpack, compilation: _webpack.Compilation, chunks: (string | number | null)[]) {
    const { RuntimeGlobals, RuntimeModule, Template } = webpack;
    
    class EagerlyLoadChunksRuntimeModule extends RuntimeModule {
        constructor() {
            super('eagerly load chunks', RuntimeModule.STAGE_TRIGGER);
        }
        generate() {
            return Template.asString(
                chunks.filter((x) => x !== null).map((x) => `${RuntimeGlobals.ensureChunk}(${JSON.stringify(x)})`)
            );
        }
    }
    compilation.hooks.additionalTreeRuntimeRequirements.tap(EagerlyLoadChunksRuntimeModule.name, (chunk, set, context) => {
        if (chunks.length) set.add(RuntimeGlobals.ensureChunk);
    })
    return new EagerlyLoadChunksRuntimeModule();
}
