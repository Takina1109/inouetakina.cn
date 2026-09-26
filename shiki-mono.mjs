/**
 * 两套纯灰阶的 Shiki 代码高亮主题（明 / 暗）
 *
 * 内置主题里最接近黑白的是 min-light / min-dark，但 min-dark 的
 * 关键字和字符串仍带紫蓝色，放在纯黑白站点里会跳色。
 * 这里只保留「灰阶 + 字重 / 斜体」来区分 token 类型。
 *
 * 想调整某个 token 的颜色，改下面 palette 里的对应字段即可。
 */

/** 组装一个灰阶主题 */
function createMonoTheme({ name, type, palette }) {
  return {
    name,
    type,
    colors: {
      'editor.background': palette.bg,
      'editor.foreground': palette.fg,
    },
    tokenColors: [
      // 兜底：没匹配到任何规则时用正文色
      { settings: { foreground: palette.fg } },

      // 注释：更浅 + 斜体
      {
        scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
        settings: { foreground: palette.comment, fontStyle: 'italic' },
      },

      // 字符串
      {
        scope: [
          'string',
          'string.quoted',
          'string.template',
          'string.regexp',
          'punctuation.definition.string',
        ],
        settings: { foreground: palette.string },
      },

      // 数字 / 常量 / 布尔值
      {
        scope: [
          'constant.numeric',
          'constant.language',
          'constant.character',
          'support.constant',
        ],
        settings: { foreground: palette.constant },
      },

      // 关键字 / 类型修饰符：加粗拉出对比
      {
        scope: [
          'keyword',
          'keyword.control',
          'storage',
          'storage.type',
          'storage.modifier',
        ],
        settings: { foreground: palette.keyword, fontStyle: 'bold' },
      },

      // 函数名 / 方法调用
      {
        scope: [
          'entity.name.function',
          'support.function',
          'variable.function',
          'meta.function-call',
        ],
        settings: { foreground: palette.function },
      },

      // 类型、类、标签
      {
        scope: [
          'entity.name.type',
          'entity.name.class',
          'entity.name.tag',
          'entity.other.inherited-class',
          'support.type',
          'support.class',
        ],
        settings: { foreground: palette.type },
      },

      // 变量 / 属性名
      {
        scope: [
          'variable',
          'variable.other',
          'variable.parameter',
          'meta.object-literal.key',
        ],
        settings: { foreground: palette.variable },
      },

      // HTML / JSX 属性名
      {
        scope: ['entity.other.attribute-name'],
        settings: { foreground: palette.attribute },
      },

      // 标点符号：放在最后，优先级最高，让括号和逗号统一变浅
      {
        scope: ['punctuation', 'meta.brace', 'meta.delimiter'],
        settings: { foreground: palette.punctuation },
      },

      { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
      { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
      { scope: ['invalid'], settings: { foreground: palette.fg, fontStyle: 'underline' } },
    ],
  };
}

/** 浅色：白底 + 黑字，越重要的 token 越黑 */
export const monoLight = createMonoTheme({
  name: 'mono-light',
  type: 'light',
  palette: {
    bg: '#ffffff',
    fg: '#1a1a1a',
    comment: '#a8a8a8',
    string: '#4f4f4f',
    constant: '#6b6b6b',
    keyword: '#000000',
    function: '#262626',
    type: '#3d3d3d',
    variable: '#1a1a1a',
    attribute: '#4f4f4f',
    punctuation: '#8f8f8f',
  },
});

/** 深色：黑底 + 白字，越重要的 token 越白 */
export const monoDark = createMonoTheme({
  name: 'mono-dark',
  type: 'dark',
  palette: {
    bg: '#0d0d0d',
    fg: '#e6e6e6',
    comment: '#6b6b6b',
    string: '#b5b5b5',
    constant: '#9e9e9e',
    keyword: '#ffffff',
    function: '#e0e0e0',
    type: '#cccccc',
    variable: '#e6e6e6',
    attribute: '#b5b5b5',
    punctuation: '#7a7a7a',
  },
});
