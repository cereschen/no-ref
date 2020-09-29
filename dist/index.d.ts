/// <reference types="node" />
import * as webpack from "webpack";
import { OptionObject } from 'loader-utils';
export interface NoRefConfig extends OptionObject {
    isVue3: boolean;
}
export declare function createNoRefVite(config: NoRefConfig): {
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
