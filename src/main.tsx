import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BriefcaseBusiness, FileText, LogIn, UploadCloud, UserPlus, WandSparkles } from 'lucide-react';
import './styles.css';

const API_BASE = 'http://localhost:8090/api';

type User = {
  id: number;
  username: string;
  email: string;
  createdAt: string;
};

type Resume = {
  id: number;
  userId: number;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  extractedText: string;
  uploadedAt: string;
};

type Analysis = {
  id: number;
  resumeId: number;
  score: number;
  skillsJson: string;
  recommendationsJson: string;
  createdAt: string;
};

function App() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('demo');
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [user, setUser] = useState<User | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const skills = useMemo(() => parseJsonList(analysis?.skillsJson), [analysis]);
  const recommendations = useMemo(() => parseJsonList(analysis?.recommendationsJson), [analysis]);

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const payload = mode === 'register' ? { username, email, password } : { username, password };
      const response = await request(`/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setUser(response.user);
      setMessage(response.message);
      await loadResumes(response.user.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function loadResumes(userId: number) {
    const data = await request(`/resumes/user/${userId}`);
    setResumes(data);
  }

  async function uploadResume(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setBusy(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('userId', String(user.id));
      form.append('file', file);
      const uploaded = await request('/resumes', { method: 'POST', body: form });
      setResumes((current) => [uploaded, ...current]);
      setMessage('Resume uploaded');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function analyzeResume(resumeId: number) {
    setBusy(true);
    setMessage('');
    try {
      setAnalysis(await request(`/analyses/resume/${resumeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription })
      }));
      setMessage(jobDescription.trim() ? 'Analysis ready with job description' : 'Analysis ready');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <section className="panel auth-panel">
        <div className="brand">
          <FileText size={28} />
          <div>
            <h1>Resume AI</h1>
            <p>Resume analyzer with AI</p>          </div>
        </div>

        <div className="segmented">
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            <UserPlus size={16} /> Register
          </button>
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            <LogIn size={16} /> Login
          </button>
        </div>

        <form onSubmit={submitAuth} className="form">
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} required />
          </label>
          {mode === 'register' && (
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </label>
          )}
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required />
          </label>
          <button className="primary" disabled={busy} type="submit">
            {mode === 'register' ? <UserPlus size={18} /> : <LogIn size={18} />}
            {busy ? 'Working...' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        {message && <p className="status">{message}</p>}
      </section>

      <section className="panel workspace">
        <header>
          <div>
            <h2>{user ? `Welcome, ${user.username}` : 'Resume workspace'}</h2>
            <p>{user ? user.email : 'Register or login to upload and analyze resumes.'}</p>
          </div>
          <label className={`upload ${!user || busy ? 'disabled' : ''}`}>
            <UploadCloud size={18} />
            Upload PDF
            <input type="file" accept="application/pdf,.pdf" disabled={!user || busy} onChange={uploadResume} />
          </label>
        </header>

        <div className="content-grid">
          <div className="list">
            <h3>Resumes</h3>
            {resumes.length === 0 && <p className="empty">No resumes uploaded yet.</p>}
            {resumes.map((resume) => (
              <article key={resume.id} className="resume-item">
                <div>
                  <strong>{resume.originalFileName}</strong>
                  <span>{Math.max(1, Math.round(resume.sizeBytes / 1024))} KB</span>
                </div>
                <button onClick={() => analyzeResume(resume.id)} disabled={busy} type="button">
                  <WandSparkles size={16} /> Analyze
                </button>
              </article>
            ))}
          </div>

          <div className="analysis">
            <h3>Analysis</h3>
            <label className="job-description">
              <span><BriefcaseBusiness size={15} /> Target job description</span>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the job description here before clicking Analyze."
                rows={7}
              />
            </label>
            {!analysis && <p className="empty">Run an analysis to see score, skills, and recommendations.</p>}
            {analysis && (
              <>
                <div className="score">
                  <span>{Math.round(analysis.score)}</span>
                  <small>/ 100</small>
                </div>
                <h4>Skills</h4>
                <div className="chips">
                  {(skills.length ? skills : ['No matched skills yet']).map((skill) => <span key={skill}>{skill}</span>)}
                </div>
                <h4>Recommendations</h4>
                <ul>
                  {recommendations.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json();
}

function parseJsonList(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
