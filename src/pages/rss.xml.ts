import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '@/data/site';
import { getPosts, postUrl } from '@/lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      /* 必须用 postUrl()：动态在 /thoughts/ 下面，硬写 /posts/ 会 404 */
      link: postUrl(post),
      categories: post.data.tags,
    })),
    customData: '<language>zh-cn</language>',
  });
}
