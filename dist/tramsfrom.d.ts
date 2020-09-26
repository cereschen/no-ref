export declare function transformJs(): ({ code }: {
    code: string;
}) => string | {
    code: string;
    map: import("magic-string").SourceMap;
};
