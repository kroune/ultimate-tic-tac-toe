const {merge} = require('webpack-merge');
const common = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
      minify: { // Максимальное сжатие HTML
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      }
    }),
    new CopyPlugin({
      patterns: [
        {from: 'img', to: 'img'},
        {from: 'css', to: 'css'},
        {from: 'js/vendor', to: 'js/vendor'},
        {from: 'icon.svg', to: 'icon.svg'},
        {from: 'favicon.ico', to: 'favicon.ico'},
        {from: 'robots.txt', to: 'robots.txt'},
        {from: '404.html', to: '404.html'},
        {from: 'site.webmanifest', to: 'site.webmanifest'},
      ],
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 2020,
          compress: {
            drop_console: true, // Удаляет все console.log
            drop_debugger: true,
            passes: 3,
            toplevel: true,
            unsafe_arrows: true,
            unsafe_methods: true,
          },
          mangle: {
            toplevel: true,
            properties: true,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
  },
});
