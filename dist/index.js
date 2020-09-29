"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNoRefVite = void 0;
const tramsfrom_1 = require("./tramsfrom");
const loader_utils_1 = require("loader-utils");
function createNoRefVite(config) {
    let transform = tramsfrom_1.transformJs(Object.assign(Object.assign({}, config), { isVite: true }));
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
    let options = loader_utils_1.getOptions(this);
    let transform = tramsfrom_1.transformJs(Object.assign(Object.assign({}, options), { isVite: false }));
    if (typeof source === "string") {
        let result = transform({ code: source });
        //@ts-ignore  source-map type
        this.callback(null, result.code, this.sourceMap ? result.map : undefined);
    }
    return;
}
exports.default = noRefWebpack;
