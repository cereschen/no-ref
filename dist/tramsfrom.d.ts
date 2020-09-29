import { NoRefConfig } from ".";
export declare function transformJs(config: NoRefConfig & {
    isVite: boolean;
}): ({ code }: {
    code: string;
}) => {
    code: string;
    map: import("magic-string").SourceMap;
};
