import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { blogApi } from '../lib/api';

export default function Blog() {
  const { slug } = useParams();
  if (slug) return <BlogPost slug={slug} />;
  return <BlogList />;
}

function BlogList() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    blogApi.list().then((d) => setPosts(d.posts)).catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">Blog &amp; cẩm nang</h1>
      <p className="mt-2 text-slate-500">Mẹo săn sale, cashback, affiliate</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {posts.map((p) => (
          <Link key={p.id} to={`/blog/${p.slug}`} className="card hover:border-shopee/40 transition">
            <h2 className="font-bold text-lg">{p.title}</h2>
            <p className="mt-2 text-sm text-slate-500 line-clamp-3">{p.excerpt}</p>
            <div className="mt-3 text-xs text-slate-400">
              {p.views} lượt xem · {new Date(p.createdAt).toLocaleDateString('vi-VN')}
            </div>
          </Link>
        ))}
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

  // very light markdown: ## and paragraphs
  const html = post.content
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      if (line.trim() === '') return '';
      return `<p>${line}</p>`;
    })
    .join('');

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/blog" className="text-sm text-shopee font-semibold">
        ← Blog
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold">{post.title}</h1>
      <div className="mt-2 text-sm text-slate-400">
        {post.views} lượt xem · {new Date(post.createdAt).toLocaleDateString('vi-VN')}
      </div>
      <div
        className="prose-blog mt-8"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
