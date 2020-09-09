# no-ref
 This plugin lets you no logger write ref() and .value

## Usage
`npm i no-ref -D` 

`yarn add no-ref -D`

### vite


```js
// vite.config.js

import { createNoRefVite } from "no-ref"

 module.exports = {
  plugins : [createNoRefVite()],
  ...
}
```
### webpack
```js
// vue.config.js
module.exports = {
 chainWebpack(config) {
    config.module
    .rule('vue')
    .use('no-ref')
    .loader('no-ref')
    .end()
  }
}
```
### 

## FAQ
### How to ignore
```js
// useRange.js
 export function useRange(){
   const start = ref(5)
   const end =ref (15)
   const width = ref(10)

   return { start, end, width }
 } 
 ```
```js
 const { start/**use-ref*/, end, width } = useRange()

 start.value++  // start.value = 6
 (end).value++  // end.value = 16
 console.log(width) // 10

 ```

## Todo
### support computed