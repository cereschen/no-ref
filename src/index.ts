import * as webpack from "webpack"
import { transformJs } from "./tramsfrom";
import { getOptions, OptionObject } from 'loader-utils';

export interface NoRefConfig extends OptionObject {
  isVue3: boolean,
}
export function createNoRefVite(config: NoRefConfig) {
  let transform = transformJs({ ...config, isVite: true })
  return {
    transforms: [{
      test(ctx: any) {
        return Boolean(ctx.path.match(/\.vue$/))
      },
      transform
    }]
  };
}

export default function noRefWebpack(
  this: webpack.loader.LoaderContext,
  source: string | Buffer
) {
  let options: NoRefConfig = getOptions(this) as NoRefConfig

  let transform = transformJs({ ...options, isVite: false })
  if (typeof source === "string") {
    let result = transform({ code: source })
    //@ts-ignore  source-map type
    this.callback(null, result.code, this.sourceMap ? result.map : undefined)
  }
  return
}
