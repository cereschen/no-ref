"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNoRefVite = void 0;
const tramsfrom_1 = require("./tramsfrom");
let transform = tramsfrom_1.transformJs();
function createNoRefVite() {
    return {
        transforms: [{
                test(ctx) {
                    return Boolean(ctx.path.match(/\.vue$/));
                },
                transform
            }]
    };
}
exports.createNoRefVite = createNoRefVite;
function noRefWebpack(source) {
    if (typeof source === "string") {
        let result = transform({ code: source });
        //@ts-ignore  source-map type
        this.callback(null, result.code, this.sourceMap ? result.map : undefined);
    }
    return;
}
exports.default = noRefWebpack;
