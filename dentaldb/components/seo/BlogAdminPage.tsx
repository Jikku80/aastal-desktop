'use client';

/**
 * components/seo/BlogAdminPage.tsx
 * Fixed:
 *  - Dark mode support throughout
 *  - No emojis
 *  - Mobile responsive
 *  - Visible input text (explicit text color classes)
 *  - Rich text editor instead of raw HTML textarea
 *    (user writes plain text/formatted content, converted to HTML under the hood)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { blogApi, seoApi } from '../../lib/api';
import { websiteApi } from '../../lib/api/websiteApi';

// ── Types ──────────────────────────────────────────────────────────────────────

type BlogStatus = 'draft' | 'published';

interface BlogPost {
  id:                  string;
  title:               string;
  slug:                string;
  excerpt:             string | null;
  content:             string | null;
  featuredImage:       string | null;
  authorName:          string | null;
  categories:          string[] | null;
  tags:                string[] | null;
  status:              BlogStatus;
  publishedAt:         string | null;
  metaTitle:           string | null;
  metaDescription:     string | null;
  metaKeywords:        string[] | null;
  ogImage:             string | null;
  indexable:           boolean;
  readingTimeMinutes:  number;
  createdAt:           string;
  updatedAt:           string;
}

interface PostFormData {
  title:            string;
  slug:             string;
  excerpt:          string;
  content:          string;   // stored as HTML, edited via rich editor
  featuredImage:    string;
  authorName:       string;
  categories:       string;
  tags:             string;
  status:           BlogStatus;
  metaTitle:        string;
  metaDescription:  string;
  metaKeywords:     string;
  ogImage:          string;
  indexable:        boolean;
}

interface LinkSuggestion {
  post:   { id: string; title: string; slug: string };
  reason: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function emptyForm(post?: BlogPost | null): PostFormData {
  return {
    title:           post?.title           ?? '',
    slug:            post?.slug            ?? '',
    excerpt:         post?.excerpt         ?? '',
    content:         post?.content         ?? '',
    featuredImage:   post?.featuredImage   ?? '',
    authorName:      post?.authorName      ?? '',
    categories:      (post?.categories    ?? []).join(', '),
    tags:            (post?.tags          ?? []).join(', '),
    status:          post?.status          ?? 'draft',
    metaTitle:       post?.metaTitle       ?? '',
    metaDescription: post?.metaDescription ?? '',
    metaKeywords:    (post?.metaKeywords  ?? []).join(', '),
    ogImage:         post?.ogImage         ?? '',
    indexable:       post?.indexable       !== false,
  };
}

function formToDto(form: PostFormData) {
  return {
    title:           form.title.trim(),
    slug:            form.slug.trim(),
    excerpt:         form.excerpt.trim()        || undefined,
    content:         form.content               || undefined,
    featuredImage:   form.featuredImage.trim()  || undefined,
    authorName:      form.authorName.trim()     || undefined,
    categories:      form.categories.split(',').map(s => s.trim()).filter(Boolean),
    tags:            form.tags.split(',').map(s => s.trim()).filter(Boolean),
    status:          form.status,
    metaTitle:       form.metaTitle.trim()       || undefined,
    metaDescription: form.metaDescription.trim() || undefined,
    metaKeywords:    form.metaKeywords.split(',').map(s => s.trim()).filter(Boolean),
    ogImage:         form.ogImage.trim()         || undefined,
    indexable:       form.indexable,
  };
}

// shared input/textarea class
const inputCls = (extra = '') =>
  `w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm
   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
   placeholder-gray-400 dark:placeholder-gray-500
   focus:outline-none focus:ring-2 focus:ring-blue-500 ${extra}`;

// ─────────────────────────────────────────────────────────────────────────────
// Rich Text Editor
// A lightweight contentEditable editor with a toolbar.
// Converts to/from HTML so the backend receives proper HTML.
// ─────────────────────────────────────────────────────────────────────────────

interface RichEditorProps {
  value:    string;       // HTML string
  onChange: (html: string) => void;
}

type FormatAction =
  | 'bold' | 'italic' | 'underline'
  | 'h2' | 'h3'
  | 'ul' | 'ol'
  | 'blockquote' | 'link' | 'unlink'
  | 'hr';

function RichEditor({ value, onChange }: RichEditorProps) {
  const editorRef  = useRef<HTMLDivElement>(null);
  const isInitRef  = useRef(false);

  // Initialise content once
  useEffect(() => {
    if (editorRef.current && !isInitRef.current) {
      editorRef.current.innerHTML = value || '';
      isInitRef.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When the parent resets the form (e.g., new post), sync the content
  useEffect(() => {
    if (editorRef.current && value === '' && editorRef.current.innerHTML !== '') {
      editorRef.current.innerHTML = '';
    }
  }, [value]);

  const emit = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
  };

  const handleAction = (action: FormatAction) => {
    switch (action) {
      case 'bold':       exec('bold');              break;
      case 'italic':     exec('italic');            break;
      case 'underline':  exec('underline');         break;
      case 'h2':         exec('formatBlock', 'h2'); break;
      case 'h3':         exec('formatBlock', 'h3'); break;
      case 'ul':         exec('insertUnorderedList'); break;
      case 'ol':         exec('insertOrderedList');   break;
      case 'blockquote': exec('formatBlock', 'blockquote'); break;
      case 'link': {
        const url = prompt('Enter URL:');
        if (url) exec('createLink', url);
        break;
      }
      case 'unlink': exec('unlink'); break;
      case 'hr':
        exec('insertHorizontalRule');
        break;
    }
  };

  const wordCount = (editorRef.current?.innerText || value.replace(/<[^>]*>/g, ' '))
    .split(/\s+/).filter(Boolean).length;
  const readTime  = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <ToolBtn label="B"       title="Bold"         style={{ fontWeight: 'bold' }}   onClick={() => handleAction('bold')} />
        <ToolBtn label="I"       title="Italic"       style={{ fontStyle: 'italic' }}  onClick={() => handleAction('italic')} />
        <ToolBtn label="U"       title="Underline"    style={{ textDecoration: 'underline' }} onClick={() => handleAction('underline')} />
        <Divider />
        <ToolBtn label="H2"      title="Heading 2"    onClick={() => handleAction('h2')} />
        <ToolBtn label="H3"      title="Heading 3"    onClick={() => handleAction('h3')} />
        <Divider />
        <ToolBtn label="UL"      title="Bullet list"  onClick={() => handleAction('ul')} />
        <ToolBtn label="OL"      title="Numbered list" onClick={() => handleAction('ol')} />
        <Divider />
        <ToolBtn label='&ldquo;' title="Blockquote"   onClick={() => handleAction('blockquote')} />
        <ToolBtn label="Link"    title="Insert link"  onClick={() => handleAction('link')} />
        <ToolBtn label="Unlink"  title="Remove link"  onClick={() => handleAction('unlink')} />
        <ToolBtn label="---"     title="Horizontal rule" onClick={() => handleAction('hr')} />
        <span className="ml-auto self-center text-xs text-gray-400 dark:text-gray-500 pr-1 whitespace-nowrap">
          {wordCount} words · {readTime} min read
        </span>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        className={`
          min-h-[320px] p-4 text-sm leading-relaxed outline-none
          bg-white dark:bg-gray-900
          text-gray-900 dark:text-gray-100
          prose dark:prose-invert max-w-none
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
          [&_blockquote]:border-l-4 [&_blockquote]:border-blue-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 dark:[&_blockquote]:text-gray-400
          [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline
          [&_hr]:border-gray-300 dark:[&_hr]:border-gray-600 [&_hr]:my-4
          overflow-y-auto
        `}
        data-placeholder="Start writing your post here. Use the toolbar above to format text — add headings, lists, quotes, and links without writing any HTML."
        style={{ caretColor: 'currentColor' }}
      />

      {/* Placeholder via CSS */}
      <style>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .dark [data-placeholder]:empty:before {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

function ToolBtn({
  label, title, onClick, style,
}: {
  label:    string;
  title:    string;
  onClick:  () => void;
  style?:   React.CSSProperties;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={style}
      className="px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700
                 text-gray-700 dark:text-gray-300 transition-colors min-w-[28px]"
      dangerouslySetInnerHTML={{ __html: label }}
    />
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 self-center mx-0.5" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Blog list view
// ─────────────────────────────────────────────────────────────────────────────

export function BlogAdminPage() {
  const [posts,    setPosts]    = useState<BlogPost[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [filter,   setFilter]   = useState<'' | BlogStatus>('');
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<BlogPost | null | 'new'>(null);
  const [error,    setError]    = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page, limit: 20 };
      if (filter) params.status = filter;
      const res  = await blogApi.list(params);
      const data = res.data ?? res;
      setPosts(data.posts ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      await blogApi.delete(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setTotal(prev => prev - 1);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaved = () => {
    setEditing(null);
    loadPosts();
  };

  if (editing !== null) {
    return (
      <BlogPostEditor
        post={editing === 'new' ? null : editing}
        onSaved={handleSaved}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Blog Posts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} total post{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          + New Post
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-5 w-fit">
        {([['', 'All'], ['draft', 'Drafts'], ['published', 'Published']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setFilter(val); setPage(1); }}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === val
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Post list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">Loading posts…</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg font-medium mb-1 text-gray-500 dark:text-gray-400">No posts yet</p>
          <p className="text-sm">Publish your first blog post to boost SEO.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => (
            <div
              key={post.id}
              className="flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {post.featuredImage && (
                  <div className="w-12 h-9 relative rounded-lg overflow-hidden flex-shrink-0 hidden sm:block">
                    <Image src={post.featuredImage} alt={post.title} fill className="object-cover" unoptimized />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      post.status === 'published'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {post.status}
                    </span>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px] sm:max-w-xs text-sm">
                      {post.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[220px] sm:max-w-none">
                    /blog/{post.slug} · {post.readingTimeMinutes} min read
                    {post.publishedAt
                      ? ` · ${new Date(post.publishedAt).toLocaleDateString()}`
                      : ''}
                    {(post.categories ?? []).length > 0
                      ? ` · ${post.categories!.join(', ')}`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 ml-3 flex-shrink-0">
                <button
                  onClick={() => setEditing(post)}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="px-3 py-1.5 text-xs font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Blog post editor
// ─────────────────────────────────────────────────────────────────────────────

type EditorTab = 'content' | 'seo' | 'links';

function BlogPostEditor({
  post,
  onSaved,
  onCancel,
}: {
  post:     BlogPost | null;
  onSaved:  () => void;
  onCancel: () => void;
}) {
  const [activeTab,    setActiveTab]    = useState<EditorTab>('content');
  const [form,         setForm]         = useState<PostFormData>(() => emptyForm(post));
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [linkSugs,     setLinkSugs]     = useState<LinkSuggestion[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiSugs,       setAiSugs]       = useState<any>(null);

  const updateField = <K extends keyof PostFormData>(key: K, val: PostFormData[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'title' && !post) {
        next.slug = slugify(val as string);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const dto = formToDto(form);
      if (post) {
        await blogApi.update(post.id, dto);
      } else {
        await blogApi.create(dto);
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const loadLinkSuggestions = async () => {
    if (!post?.id) return;
    setLoadingLinks(true);
    try {
      const res  = await blogApi.linkSuggestions(post.id);
      const data = res.data ?? res;
      setLinkSugs(Array.isArray(data) ? data : []);
    } catch {
      setLinkSugs([]);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'links' && post?.id) {
      loadLinkSuggestions();
    }
  }, [activeTab, post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAiSuggestions = async () => {
    setAiLoading(true);
    try {
      const siteData = await websiteApi.get();
      const sub = siteData?.subdomain ?? siteData?.customDomain ?? '';
      if (!sub) { setAiSugs({ error: 'No subdomain configured for this clinic' }); return; }
      const res  = await seoApi.getAiSuggestions(sub);
      setAiSugs(res.data ?? res);
    } catch (e: any) {
      setAiSugs({ error: e.message });
    } finally {
      setAiLoading(false);
    }
  };

  const insertInternalLink = (slug: string, title: string) => {
    const anchor = `<a href="/blog/${slug}">${title}</a>`;
    updateField('content', (form.content ?? '') + ' ' + anchor);
  };

  const charCount = (s: string) => s.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {post ? 'Edit Post' : 'New Post'}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={form.status}
            onChange={e => updateField('status', e.target.value as BlogStatus)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Editor tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit overflow-x-auto">
        {([
          ['content', 'Content'],
          ['seo',     'SEO & Meta'],
          ['links',   'Internal Links'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'content' && (
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="Post title"
              className={inputCls('px-4 py-2.5')}
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">URL Slug</label>
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5
                            bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500">
              <span className="text-sm text-gray-400 dark:text-gray-500 flex-shrink-0">/blog/</span>
              <input
                type="text"
                value={form.slug}
                onChange={e => updateField('slug', slugify(e.target.value))}
                className="flex-1 text-sm focus:outline-none bg-transparent text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Excerpt</label>
            <textarea
              value={form.excerpt}
              onChange={e => updateField('excerpt', e.target.value)}
              rows={2}
              placeholder="Brief summary shown in blog listings and social shares"
              className={inputCls('resize-none')}
            />
          </div>

          {/* Rich text content editor */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Content
            </label>
            <RichEditor
              value={form.content}
              onChange={v => updateField('content', v)}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Write naturally — use the toolbar to add headings, bullet points, links, and more.
              Your content is automatically formatted as HTML for the best SEO results.
            </p>
          </div>

          {/* Two-column: image + author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Featured Image URL</label>
              <input
                type="text"
                value={form.featuredImage}
                onChange={e => updateField('featuredImage', e.target.value)}
                placeholder="https://…"
                className={inputCls()}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Author Name</label>
              <input
                type="text"
                value={form.authorName}
                onChange={e => updateField('authorName', e.target.value)}
                placeholder="Dr. Smith"
                className={inputCls()}
              />
            </div>
          </div>

          {/* Categories + Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Categories <span className="font-normal text-gray-400 dark:text-gray-500">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={form.categories}
                onChange={e => updateField('categories', e.target.value)}
                placeholder="Dental Health, Tips"
                className={inputCls()}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tags <span className="font-normal text-gray-400 dark:text-gray-500">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={e => updateField('tags', e.target.value)}
                placeholder="toothache, prevention"
                className={inputCls()}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SEO tab ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'seo' && (
        <div className="space-y-5">
          {/* AI suggestions banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">AI SEO Suggestions</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Auto-generate title, description and keywords from your clinic data
              </p>
            </div>
            <button
              onClick={loadAiSuggestions}
              disabled={aiLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex-shrink-0"
            >
              {aiLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>

          {/* AI suggestion pills */}
          {aiSugs && !aiSugs.error && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                AI Suggestions — click to apply
              </p>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Suggested title:</p>
                <button onClick={() => updateField('metaTitle', aiSugs.suggestedTitle)}
                  className="text-sm text-left text-blue-900 dark:text-blue-200 hover:underline">
                  {aiSugs.suggestedTitle}
                </button>
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Suggested description:</p>
                <button onClick={() => updateField('metaDescription', aiSugs.suggestedDescription)}
                  className="text-sm text-left text-blue-900 dark:text-blue-200 hover:underline">
                  {aiSugs.suggestedDescription}
                </button>
              </div>
              {aiSugs.suggestedKeywords?.length > 0 && (
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Suggested keywords:</p>
                  <button onClick={() => updateField('metaKeywords', aiSugs.suggestedKeywords.join(', '))}
                    className="text-sm text-left text-blue-900 dark:text-blue-200 hover:underline">
                    {aiSugs.suggestedKeywords.slice(0, 6).join(', ')}
                  </button>
                </div>
              )}
            </div>
          )}
          {aiSugs?.error && (
            <p className="text-sm text-red-500">{aiSugs.error}</p>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-800 dark:text-blue-300">
            Customize how this post appears in Google. Defaults to content values if left empty.
          </div>

          {/* SEO title */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">SEO Title</label>
              <span className={`text-xs ${charCount(form.metaTitle) > 60 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                {charCount(form.metaTitle)}/60
              </span>
            </div>
            <input
              type="text"
              value={form.metaTitle}
              onChange={e => updateField('metaTitle', e.target.value)}
              placeholder={form.title || 'Post Title | Clinic Name'}
              className={inputCls(charCount(form.metaTitle) > 60 ? '!border-red-400' : '')}
            />
          </div>

          {/* Meta description */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Meta Description</label>
              <span className={`text-xs ${charCount(form.metaDescription) > 160 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                {charCount(form.metaDescription)}/160
              </span>
            </div>
            <textarea
              value={form.metaDescription}
              onChange={e => updateField('metaDescription', e.target.value)}
              rows={3}
              placeholder={form.excerpt || 'Brief description for search results…'}
              className={inputCls(`resize-none ${charCount(form.metaDescription) > 160 ? '!border-red-400' : ''}`)}
            />
          </div>

          {/* Meta keywords */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Meta Keywords <span className="font-normal text-gray-400 dark:text-gray-500">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.metaKeywords}
              onChange={e => updateField('metaKeywords', e.target.value)}
              placeholder="dental care, Kathmandu dentist, tooth pain"
              className={inputCls()}
            />
          </div>

          {/* OG image */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Social Share Image URL <span className="font-normal text-gray-400 dark:text-gray-500">(overrides featured image)</span>
            </label>
            <input
              type="text"
              value={form.ogImage}
              onChange={e => updateField('ogImage', e.target.value)}
              placeholder="https://… (1200×630px)"
              className={inputCls()}
            />
          </div>

          {/* Indexable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.indexable}
              onChange={e => updateField('indexable', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Allow search engines to index this post</span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Uncheck to add noindex — useful for drafts or private posts</p>
            </div>
          </label>

          {/* SERP preview */}
          {(form.metaTitle || form.title) && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Google SERP Preview
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-base font-medium leading-snug">
                {(form.metaTitle || form.title).substring(0, 60)}
              </p>
              <p className="text-green-700 dark:text-green-500 text-xs mt-0.5">
                yourdomain.com/blog/{form.slug || 'post-slug'}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                {(form.metaDescription || form.excerpt || 'No description set.').substring(0, 160)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Internal links tab ──────────────────────────────────────────────────── */}
      {activeTab === 'links' && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Internal Linking</p>
            <p className="text-xs">
              Internal links help search engines discover your content and distribute link equity.
              These suggestions are based on shared keywords and tags with your other posts.
            </p>
          </div>

          {!post?.id ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
              Save the post first to see internal link suggestions.
            </p>
          ) : loadingLinks ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Loading suggestions…</p>
          ) : linkSugs.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
              No suggestions yet. Add more tags/categories to improve matching.
            </p>
          ) : (
            <div className="space-y-3">
              {linkSugs.map(({ post: p, reason }) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{p.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">/blog/{p.slug} · {reason}</p>
                  </div>
                  <button
                    onClick={() => insertInternalLink(p.slug, p.title)}
                    className="ml-4 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Insert Link
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
