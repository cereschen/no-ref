import * as webpack from "webpack"
import { transformJs } from "./tramsfrom";

let transform = transformJs()
export function createNoRefVite () {
    return {
        transforms: [{
            test (ctx:any) {
                return Boolean(ctx.path.match(/\.vue$/))
            },
            transform
        }]
    };
}

export default function noRefWebpack (
    this: webpack.loader.LoaderContext,
    source: string | Buffer
  ) {
    if(typeof source === "string"){
      let result = transform({code:source})
        //@ts-ignore  source-map type
      this.callback(null, result.code, this.sourceMap ? result.map : undefined)
    }
    return
  }
