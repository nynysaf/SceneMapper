'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setErrorMessage((data as { error?: string }).error || 'Something went wrong. Please try again.');
        return;
      }
      setStatus('success');
      setName('');
      setEmail('');
      setSubject('');
      setBody('');
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] text-emerald-950">
      <header className="border-b border-emerald-100 bg-white/70 backdrop-blur px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-emerald-800 hover:text-emerald-700">
          ← Back to Scene Mapper
        </Link>
      </header>
      <main className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-emerald-950 mb-6">Contact our guild</h1>

        <div className="prose prose-emerald mb-10">
          <p className="text-emerald-800 leading-relaxed">
            Scene Mapper is one tool used by a guild of systems mappers and network mappers, part
            of an even larger network of systems convenors, facilitators, and consultants. Seeing
            and nurturing systems and scenes is a learnable skill, and we love to support those
            on their learning journey.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-emerald-900 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/80 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-emerald-900 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/80 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
              placeholder="you@example.org"
            />
          </div>
          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-emerald-900 mb-1">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white/80 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
              placeholder="e.g. Workshop inquiry"
            />
          </div>
          <div>
            <label htmlFor="body" className="block text-sm font-semibold text-emerald-900 mb-1">
              Message
            </label>
            <textarea
              id="body"
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-white/80 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 resize-y"
              placeholder="Tell us about workshops, consulting, or custom software you're interested in..."
            />
          </div>

          {status === 'success' && (
            <p className="text-emerald-700 text-sm font-medium bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              Thank you! Your message has been sent. We&apos;ll get back to you soon.
            </p>
          )}
          {status === 'error' && (
            <p className="text-rose-700 text-sm font-medium bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold text-sm solarpunk-shadow hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            {status === 'sending' ? 'Sending…' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  );
}
