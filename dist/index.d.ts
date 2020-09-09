/// <reference types="node" />
import * as webpack from "webpack";
export declare function createNoRefVite(): {
    transforms: {
        test(ctx: any): boolean;
        transform: ({ code }: {
            code: string;
        }) => {
            code: string;
            map: import("magic-string").SourceMap;
        };
    }[];
};
export default function noRefWebpack(this: webpack.loader.LoaderContext, source: string | Buffer): void;
