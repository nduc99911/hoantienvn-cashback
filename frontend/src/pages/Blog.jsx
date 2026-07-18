import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { blogApi } from '../lib/api';
import SeoHead from '../components/SeoHead';

export default function Blog() {
  const { slug } = useParams();
  if (slug) return <BlogPost slug={slug} />;
  return <BlogList />;
}

function BlogList() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [params, setParams] = useSearchParams();
  const cat = params.get('category') || '';

  useEffect(() => {
    blogApi
      .list(cat || undefined)
      .then((d) => setPosts(d.posts || []))
      .catch(console.error);
  }, [cat]);

  useEffect(() => {
    blogApi.categories?.().then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pb-20">
      <h1 className="text-3xl font-extrabold">
        Blog hoàn tiền Shopee &amp; mẹo cashback
      </h1>
      <p className="mt-2 text-slate-500">
        Cẩm nang hoàn tiền Shopee, săn sale, hold, rút MoMo, bot Telegram
      </p>

      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setParams({})}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              !cat ? 'bg-shopee text-white' : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            Tất cả
          </button>
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setParams({ category: c.name })}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                cat === c.name
                  ? 'bg-shopee text-white'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {c.name} ({c.count})
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.id}
            to={`/blog/${p.slug}`}
            className="card hover:border-shopee/40 transition"
          >
            {p.category && (
              <div className="text-xs font-semibold text-shopee">{p.category}</div>
            )}
            <h2 className="font-bold text-lg mt-1">{p.title}</h2>
            <p className="mt-2 text-sm text-slate-500 line-clamp-3">{p.excerpt}</p>
            <div className="mt-3 text-xs text-slate-400">
              {p.views} lượt xem ·{' '}
              {new Date(p.createdAt).toLocaleDateString('vi-VN')}
            </div>
          </Link>
        ))}
        {!posts.length && (
          <div className="text-slate-400 col-span-full text-center py-12">
            Chưa có bài viết
          </div>
        )}
      </div>
    </div>
  );
}

function BlogPost({ slug }) {
  const [post, setPost] = useState(null);
  useEffect(() => {
    blogApi.get(slug).then((d) => setPost(d.post)).catch(console.error);
  }, [slug]);

  if (!post) {
    return <div className="py-20 text-center text-slate-400">Đang tải...</div>;
  }

  const html = post.content
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
      if (line.trim() === '') return '';
      // Escape basic HTML from content lines
      const safe = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<p>${safe}</p>`;
    })
    .join('');

  const path = `/blog/${slug}`;
  const desc =
    post.excerpt ||
    `Đọc bài ${post.title} trên blog HoanTienVN — cẩm nang hoàn tiền Shopee, cashback và săn sale.`;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 pb-20">
      <SeoHead
        title={`${post.title} | HoanTienVN`}
        description={desc}
        path={path}
        type="article"
        keywords={`${post.title}, hoàn tiền shopee, cashback shopee`}
        articleMeta={{ datePublished: post.createdAt }}
      />
      <Link to="/blog" className="text-sm text-shopee font-semibold">
        ← Blog hoàn tiền Shopee
      </Link>
      {post.category && (
        <div className="mt-3 text-xs font-semibold text-shopee">{post.category}</div>
      )}
      <h1 className="mt-2 text-3xl font-extrabold">{post.title}</h1>
      <div className="mt-2 text-sm text-slate-400">
        {post.views} lượt xem ·{' '}
        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
      </div>
      <div className="prose-blog mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="mt-10 rounded-2xl border border-orange-100 bg-orange-50/50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="font-semibold text-slate-800 dark:text-slate-100">
          Bắt đầu hoàn tiền Shopee trên HoanTienVN
        </p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Đăng ký miễn phí, dán link sản phẩm, lấy short link và mua như bình thường.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/register" className="btn-primary !py-2 !px-4 text-sm">
            Đăng ký ngay
          </Link>
          <Link to="/guide" className="btn-secondary !py-2 !px-4 text-sm">
            Xem hướng dẫn
          </Link>
        </div>
      </div>
    </article>
  );
}
