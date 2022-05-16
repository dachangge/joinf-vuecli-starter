const { defineConfig } = require("@vue/cli-service");
const path = require("path");
const resolve = (dir) => {
  return path.join(__dirname, dir);
};
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    hot: true,
    // https: true,
    port: 8807,
  },
  // /**
  //  * A function that will receive an instance of `ChainableConfig` powered by [webpack-chain](https://github.com/mozilla-neutrino/webpack-chain)
  //  */
  //  chainWebpack?: (config: ChainableWebpackConfig) => void;
  //  /**
  //   * Set webpack configuration.  If the value is `Object`, will be merged into config.  If value is `Function`, will receive current config as argument
  //   */
  //  configureWebpack?: WebpackOptions | ((config: WebpackOptions) => (WebpackOptions | void));

  chainWebpack: (config) => {
    config.module.rule("svg").exclude.add(resolve("src/assets/svg")).end();
    config.module
      .rule("svg-sprite-loader")
      .test(/\.svg$/)
      .include.add(resolve("src/assets/svg"))
      .end()
      .use("svg-sprite-loader")
      .loader("svg-sprite-loader")
      .options({
        symbolId: "icon-[name]",
      });
  },
});
