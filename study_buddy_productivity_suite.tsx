import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Timer, Target, CheckSquare, BarChart2, Calendar as CalendarIcon,
  BookOpen, HelpCircle, FileText, Palette, Play, Pause, RotateCcw,
  Volume2, VolumeX, Plus, Trash2, Check, Edit3, Award, Flame,
  Clock, ArrowRight, ArrowLeft, ChevronRight, Search, Tag, Eye,
  Sparkles, Layers, RefreshCw, Star, Shield, Layout, ChevronLeft,
  Calendar as Cal, ChevronUp, ChevronDown, Music, Bell, Coffee, Sun, Moon
} from 'lucide-react';

// --- SOUND UTILITIES (Web Audio API Synthesizers) ---
class SoundManager {
  constructor() {
    this.ctx = null;
    this.ambientNodes = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playBeep(freq = 587.33, duration = 0.4) {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.log('Audio playback prevented or unsupported');
    }
  }

  startAmbient(type) {
    this.stopAmbient();
    this.init();
    if (type === 'none') return;

    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (type === 'white' || type === 'rain') {
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      } else if (type === 'cafe' || type === 'lofi') {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
        }
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      if (type === 'rain') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      } else if (type === 'cafe') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        filter.Q.setValueAtTime(1, this.ctx.currentTime);
      } else if (type === 'lofi') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, this.ctx.currentTime);
      } else {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, this.ctx.currentTime);
      }

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
      this.ambientNodes = { source: whiteNoise, gain };
    } catch (e) {
      console.log('Ambient audio error:', e);
    }
  }

  stopAmbient() {
    if (this.ambientNodes) {
      try {
        this.ambientNodes.source.stop();
        this.ambientNodes.source.disconnect();
      } catch (e) {}
      this.ambientNodes = null;
    }
  }
}

const soundManager = new SoundManager();

// --- INITIAL MOCK DATA ---
const initialGoals = [
  { id: 'g1', title: 'Midterm Physics Exam', targetDate: '2026-11-15T09:00', priority: 'High', category: 'Physics', progress: 45 },
  { id: 'g2', title: 'Computer Science Final Project', targetDate: '2026-12-01T23:59', priority: 'Urgent', category: 'CS', progress: 70 },
  { id: 'g3', title: 'Organic Chemistry Lab Report', targetDate: '2026-11-05T17:00', priority: 'Medium', category: 'Chemistry', progress: 20 },
];

const initialTasks = [
  { id: 't1', title: 'Review Newton Laws & Friction', subject: 'Physics', completed: true, priority: 'High', pomodoros: 3, dueDate: '2026-11-02' },
  { id: 't2', title: 'Implement React Router & State Management', subject: 'CS', completed: false, priority: 'High', pomodoros: 4, dueDate: '2026-11-04' },
  { id: 't3', title: 'Memorize Organic Reaction Mechanisms', subject: 'Chemistry', completed: false, priority: 'Medium', pomodoros: 2, dueDate: '2026-11-06' },
  { id: 't4', title: 'Read Chapter 4 Literature Analysis', subject: 'English', completed: true, priority: 'Low', pomodoros: 1, dueDate: '2026-10-30' },
];

const initialFlashcardDecks = [
  {
    id: 'd1',
    title: 'Computer Science: Data Structures',
    subject: 'CS',
    cards: [
      { id: 'c1', front: 'What is the time complexity of searching a Binary Search Tree (balanced)?', back: 'O(log n)' },
      { id: 'c2', front: 'What is a Hash Map collision?', back: 'When two different keys compute to the same hash index.' },
      { id: 'c3', front: 'Stack vs Queue data structure behavior?', back: 'Stack is LIFO (Last In First Out), Queue is FIFO (First In First Out).' }
    ]
  },
  {
    id: 'd2',
    title: 'Organic Chemistry Essentials',
    subject: 'Chemistry',
    cards: [
      { id: 'c4', front: 'What is a Nucleophile?', back: 'An electron-rich species that donates an electron pair to form a chemical bond.' },
      { id: 'c5', front: 'What is an Electrophile?', back: 'An electron-deficient species that accepts an electron pair.' }
    ]
  }
];

const initialQuizzes = [
  {
    id: 'q1',
    title: 'CS 101: Fundamentals Quiz',
    subject: 'CS',
    timeLimit: 10,
    questions: [
      { id: 'q1_1', text: 'Which data structure follows FIFO principle?', options: ['Stack', 'Queue', 'Array', 'Tree'], correctIndex: 1 },
      { id: 'q1_2', text: 'What is the worst-case time complexity of QuickSort?', options: ['O(n log n)', 'O(n)', 'O(n^2)', 'O(1)'], correctIndex: 2 },
      { id: 'q1_3', text: 'Which keyword in JavaScript declares a block-scoped variable?', options: ['var', 'let', 'global', 'define'], correctIndex: 1 }
    ]
  }
];

const initialModules = [
  {
    id: 'm1',
    title: 'CS 202: Algorithms & Complexity',
    code: 'CS202',
    notes: 'Focus heavily on dynamic programming patterns and graph traversals (BFS/DFS). Review Dijkstra algorithm steps.',
    activeRecall: [
      'Can you explain the difference between Greedy algorithms and Dynamic Programming?',
      'How does Floyd-Warshall solve all-pairs shortest path?'
    ],
    links: ['https://developer.mozilla.org', 'https://geeksforgeeks.org']
  },
  {
    id: 'm2',
    title: 'PHYS 101: Classical Mechanics',
    code: 'PHYS101',
    notes: 'Kinematics formulas, conservation of momentum, torque calculations, and rotational inertia.',
    activeRecall: ['What is the formula for rotational kinetic energy?', 'State Kepler\'s three laws of planetary motion.'],
    links: ['https://khanacademy.org']
  }
];

const initialEvents = [
  { id: 'e1', title: 'CS Group Study Session', date: '2026-11-03', color: '#6366f1' },
  { id: 'e2', title: 'Physics Midterm Exam', date: '2026-11-15', color: '#ef4444' },
  { id: 'e3', title: 'Chemistry Lab Review', date: '2026-11-10', color: '#10b981' }
];

// --- THEME DEFINITIONS ---
const themes = {
  emerald: {
    name: 'Emerald Focus',
    bg: 'bg-emerald-950 text-emerald-100',
    card: 'bg-emerald-900/40 border-emerald-800/60 backdrop-blur-md',
    sidebar: 'bg-emerald-950/90 border-emerald-800/40',
    accent: 'bg-emerald-500 hover:bg-emerald-600 text-slate-950',
    accentText: 'text-emerald-400',
    border: 'border-emerald-800/50',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]'
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    bg: 'bg-slate-950 text-pink-100',
    card: 'bg-slate-900/60 border-pink-500/30 backdrop-blur-md',
    sidebar: 'bg-slate-950/90 border-cyan-500/30',
    accent: 'bg-gradient-to-r from-pink-500 to-cyan-400 text-slate-950 font-bold hover:opacity-90',
    accentText: 'text-pink-400',
    border: 'border-pink-500/30',
    glow: 'shadow-[0_0_25px_rgba(236,72,153,0.3)]'
  },
  sunset: {
    name: 'Warm Sunset',
    bg: 'bg-slate-950 text-amber-100',
    card: 'bg-amber-950/20 border-amber-700/40 backdrop-blur-md',
    sidebar: 'bg-slate-950/90 border-amber-800/40',
    accent: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:opacity-90',
    accentText: 'text-amber-400',
    border: 'border-amber-700/40',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]'
  },
  lavender: {
    name: 'Pastel Lavender',
    bg: 'bg-slate-950 text-purple-100',
    card: 'bg-purple-950/30 border-purple-800/40 backdrop-blur-md',
    sidebar: 'bg-slate-950/90 border-purple-800/40',
    accent: 'bg-purple-500 hover:bg-purple-600 text-white',
    accentText: 'text-purple-300',
    border: 'border-purple-800/40',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.2)]'
  },
  dark: {
    name: 'Midnight Dark',
    bg: 'bg-slate-900 text-slate-100',
    card: 'bg-slate-800/50 border-slate-700/60 backdrop-blur-md',
    sidebar: 'bg-slate-900/90 border-slate-800',
    accent: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    accentText: 'text-indigo-400',
    border: 'border-slate-700/60',
    glow: 'shadow-[0_0_15px_rgba(99,102,241,0.25)]'
  },
  light: {
    name: 'Clean Light',
    bg: 'bg-slate-50 text-slate-800',
    card: 'bg-white/80 border-slate-200 backdrop-blur-md shadow-sm',
    sidebar: 'bg-white/90 border-slate-200',
    accent: 'bg-blue-600 hover:bg-blue-700 text-white',
    accentText: 'text-blue-600',
    border: 'border-slate-200',
    glow: 'shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
  }
};

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('timer');
  const [currentThemeKey, setCurrentThemeKey] = useState('emerald');
  const activeTheme = themes[currentThemeKey];

  // Global Persistence Setup
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('sb_goals');
    return saved ? JSON.parse(saved) : initialGoals;
  });
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('sb_tasks');
    return saved ? JSON.parse(saved) : initialTasks;
  });
  const [decks, setDecks] = useState(() => {
    const saved = localStorage.getItem('sb_decks');
    return saved ? JSON.parse(saved) : initialFlashcardDecks;
  });
  const [quizzes, setQuizzes] = useState(() => {
    const saved = localStorage.getItem('sb_quizzes');
    return saved ? JSON.parse(saved) : initialQuizzes;
  });
  const [modules, setModules] = useState(() => {
    const saved = localStorage.getItem('sb_modules');
    return saved ? JSON.parse(saved) : initialModules;
  });
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('sb_events');
    return saved ? JSON.parse(saved) : initialEvents;
  });
  const [totalStudyMinutes, setTotalStudyMinutes] = useState(140);
  const [streakDays, setStreakDays] = useState(5);

  useEffect(() => localStorage.setItem('sb_goals', JSON.stringify(goals)), [goals]);
  useEffect(() => localStorage.setItem('sb_tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('sb_decks', JSON.stringify(decks)), [decks]);
  useEffect(() => localStorage.setItem('sb_quizzes', JSON.stringify(quizzes)), [quizzes]);
  useEffect(() => localStorage.setItem('sb_modules', JSON.stringify(modules)), [modules]);
  useEffect(() => localStorage.setItem('sb_events', JSON.stringify(events)), [events]);

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-300 ${activeTheme.bg}`}>
      {/* SIDEBAR NAVIGATION */}
      <aside className={`w-full md:w-64 p-4 border-b md:border-b-0 md:border-r flex flex-col justify-between backdrop-blur-lg ${activeTheme.sidebar}`}>
        <div>
          {/* Logo & Header */}
          <div className="flex items-center space-x-3 mb-8 px-2">
            <div className={`p-2.5 rounded-xl ${activeTheme.accent} shadow-lg`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight leading-tight">StudyBuddy</h1>
              <p className="text-xs opacity-70">Ultimate Study Suite</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5">
            {[
              { id: 'timer', label: 'Study Timer', icon: Timer },
              { id: 'goals', label: 'Goal Countdown', icon: Target },
              { id: 'tasks', label: 'Task Checklist', icon: CheckSquare },
              { id: 'analytics', label: 'Progress Analytics', icon: BarChart2 },
              { id: 'calendar', label: 'Planner Calendar', icon: CalendarIcon },
              { id: 'flashcards', label: 'Flashcard Decks', icon: Layers },
              { id: 'quizzes', label: 'Assessments & Admin', icon: HelpCircle },
              { id: 'modules', label: 'Course Notebook', icon: BookOpen },
              { id: 'themes', label: 'Personalize & Settings', icon: Palette }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? `${activeTheme.accent} ${activeTheme.glow}`
                      : 'hover:bg-white/10 opacity-80 hover:opacity-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Stats Footer */}
        <div className={`mt-6 p-3 rounded-xl ${activeTheme.card} border ${activeTheme.border}`}>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center space-x-1 font-semibold">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
              <span>{streakDays} Day Streak</span>
            </span>
            <span className="opacity-70">{Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m</span>
          </div>
          <div className="w-full bg-slate-700/40 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-orange-400 h-full rounded-full w-4/5"></div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {activeTab === 'timer' && (
          <StudyTimerTab
            activeTheme={activeTheme}
            onSessionComplete={(mins) => setTotalStudyMinutes(prev => prev + mins)}
          />
        )}
        {activeTab === 'goals' && (
          <GoalCountdownTab
            activeTheme={activeTheme}
            goals={goals}
            setGoals={setGoals}
          />
        )}
        {activeTab === 'tasks' && (
          <TaskChecklistTab
            activeTheme={activeTheme}
            tasks={tasks}
            setTasks={setTasks}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            activeTheme={activeTheme}
            tasks={tasks}
            goals={goals}
            totalStudyMinutes={totalStudyMinutes}
            streakDays={streakDays}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarTab
            activeTheme={activeTheme}
            events={events}
            setEvents={setEvents}
          />
        )}
        {activeTab === 'flashcards' && (
          <FlashcardsTab
            activeTheme={activeTheme}
            decks={decks}
            setDecks={setDecks}
          />
        )}
        {activeTab === 'quizzes' && (
          <QuizzesTab
            activeTheme={activeTheme}
            quizzes={quizzes}
            setQuizzes={setQuizzes}
          />
        )}
        {activeTab === 'modules' && (
          <CourseNotebookTab
            activeTheme={activeTheme}
            modules={modules}
            setModules={setModules}
          />
        )}
        {activeTab === 'themes' && (
          <ThemesTab
            currentThemeKey={currentThemeKey}
            setCurrentThemeKey={setCurrentThemeKey}
            activeTheme={activeTheme}
          />
        )}
      </main>
    </div>
  );
}

// ==========================================
// 1. STUDY TIMER COMPONENT
// ==========================================
function StudyTimerTab({ activeTheme, onSessionComplete }) {
  const [timerMode, setTimerMode] = useState('pomodoro'); // pomodoro, shortBreak, longBreak
  const [duration, setDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [ambientSound, setAmbientSound] = useState('none');
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Set modes
  const handleModeChange = (mode, minutes) => {
    setTimerMode(mode);
    setDuration(minutes * 60);
    setTimeLeft(minutes * 60);
    setIsRunning(false);
  };

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      if (audioEnabled) soundManager.playBeep(880, 0.8);
      if (timerMode === 'pomodoro') {
        onSessionComplete(Math.round(duration / 60));
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerMode, duration, audioEnabled, onSessionComplete]);

  // Ambient sound handler
  useEffect(() => {
    if (isRunning && ambientSound !== 'none') {
      soundManager.startAmbient(ambientSound);
    } else {
      soundManager.stopAmbient();
    }
    return () => soundManager.stopAmbient();
  }, [isRunning, ambientSound]);

  const toggleTimer = () => {
    soundManager.init();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(duration);
  };

  const minutesStr = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secondsStr = String(timeLeft % 60).padStart(2, '0');
  const progressPercent = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Study Focus Timer</h2>
          <p className="text-sm opacity-70">Master your focus with Pomodoro cycles and ambient white noise.</p>
        </div>
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`p-2.5 rounded-lg border ${activeTheme.border} ${activeTheme.card} flex items-center space-x-2 text-sm`}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-50" />}
          <span className="text-xs font-medium">{audioEnabled ? 'Sound On' : 'Muted'}</span>
        </button>
      </div>

      {/* Timer Controls & Display Card */}
      <div className={`p-8 md:p-12 rounded-2xl border flex flex-col items-center justify-center text-center relative overflow-hidden ${activeTheme.card} ${activeTheme.glow}`}>
        {/* Mode Selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 bg-black/20 p-1.5 rounded-xl backdrop-blur-sm">
          {[
            { id: 'pomodoro', label: 'Focus (25m)', mins: 25 },
            { id: 'shortBreak', label: 'Short Break (5m)', mins: 5 },
            { id: 'longBreak', label: 'Long Break (15m)', mins: 15 }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id, m.mins)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                timerMode === m.id
                  ? `${activeTheme.accent} shadow`
                  : 'hover:bg-white/10 opacity-70'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Circular Display / Timer Counter */}
        <div className="relative my-4 flex items-center justify-center">
          <svg className="w-64 h-64 md:w-80 md:h-80 transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="42%"
              className="stroke-current opacity-10"
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="50%"
              cy="50%"
              r="42%"
              className="stroke-current transition-all duration-500 ease-linear"
              strokeWidth="12"
              strokeDasharray={2 * Math.PI * 130}
              strokeDashoffset={(2 * Math.PI * 130) * (1 - progressPercent / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl md:text-7xl font-mono font-extrabold tracking-tighter">
              {minutesStr}:{secondsStr}
            </span>
            <span className="text-xs uppercase tracking-widest mt-2 opacity-60 font-semibold">
              {isRunning ? 'Session Active' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-4 mt-6">
          <button
            onClick={toggleTimer}
            className={`px-8 py-3.5 rounded-xl font-bold text-lg flex items-center space-x-2 transition-transform active:scale-95 ${activeTheme.accent} ${activeTheme.glow}`}
          >
            {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            <span>{isRunning ? 'PAUSE' : 'START FOCUS'}</span>
          </button>
          <button
            onClick={resetTimer}
            className={`p-3.5 rounded-xl border ${activeTheme.border} hover:bg-white/10 opacity-80 transition-colors`}
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Ambient Noise Generator Controls */}
      <div className={`p-5 rounded-xl border ${activeTheme.card} ${activeTheme.border}`}>
        <div className="flex items-center space-x-2 mb-3">
          <Music className="w-5 h-5 opacity-80" />
          <h3 className="font-semibold text-sm">Ambient Background Sounds</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { id: 'none', label: 'Off / Silent' },
            { id: 'rain', label: 'Rainfall' },
            { id: 'cafe', label: 'Cozy Cafe' },
            { id: 'white', label: 'White Noise' },
            { id: 'lofi', label: 'Lo-Fi Chill' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setAmbientSound(s.id)}
              className={`p-3 rounded-lg border text-xs font-medium transition-all text-center ${
                ambientSound === s.id
                  ? `${activeTheme.accent} ${activeTheme.border}`
                  : `${activeTheme.border} hover:bg-white/5 opacity-70`
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. GOAL COUNTDOWN COMPONENT
// ==========================================
function GoalCountdownTab({ activeTheme, goals, setGoals }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPriority, setNewPriority] = useState('High');
  const [newCategory, setNewCategory] = useState('General');

  const addGoal = (e) => {
    e.preventDefault();
    if (!newTitle || !newDate) return;
    const item = {
      id: 'g_' + Date.now(),
      title: newTitle,
      targetDate: newDate,
      priority: newPriority,
      category: newCategory,
      progress: 0
    };
    setGoals([...goals, item]);
    setNewTitle('');
    setNewDate('');
    setShowAddModal(false);
  };

  const deleteGoal = (id) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const updateProgress = (id, delta) => {
    setGoals(goals.map(g => {
      if (g.id === id) {
        const next = Math.min(100, Math.max(0, g.progress + delta));
        return { ...g, progress: next };
      }
      return g;
    }));
  };

  // Helper for countdown logic
  const getRemainingTime = (target) => {
    const total = Date.parse(target) - Date.parse(new Date());
    if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { days, hours, minutes, seconds, expired: false };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Exam & Goal Countdowns</h2>
          <p className="text-sm opacity-70">Track upcoming deadlines and exam target dates in real time.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2 ${activeTheme.accent} ${activeTheme.glow}`}
        >
          <Plus className="w-4 h-4" />
          <span>Add Target Goal</span>
        </button>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(goal => {
          const time = getRemainingTime(goal.targetDate);
          return (
            <div key={goal.id} className={`p-6 rounded-2xl border ${activeTheme.card} ${activeTheme.border} space-y-4 relative`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2 ${
                    goal.priority === 'Urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    goal.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {goal.priority} Priority • {goal.category}
                  </span>
                  <h3 className="text-lg font-bold">{goal.title}</h3>
                </div>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="opacity-50 hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>

              {/* Countdown Numbers */}
              <div className="grid grid-cols-4 gap-2 text-center bg-black/20 p-3 rounded-xl">
                <div>
                  <span className="text-2xl font-mono font-bold">{time.days}</span>
                  <p className="text-[10px] uppercase opacity-60">Days</p>
                </div>
                <div>
                  <span className="text-2xl font-mono font-bold">{time.hours}</span>
                  <p className="text-[10px] uppercase opacity-60">Hours</p>
                </div>
                <div>
                  <span className="text-2xl font-mono font-bold">{time.minutes}</span>
                  <p className="text-[10px] uppercase opacity-60">Mins</p>
                </div>
                <div>
                  <span className="text-2xl font-mono font-bold">{time.seconds}</span>
                  <p className="text-[10px] uppercase opacity-60">Secs</p>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="opacity-70">Preparation Readiness</span>
                  <span>{goal.progress}%</span>
                </div>
                <div className="w-full bg-slate-700/30 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    onClick={() => updateProgress(goal.id, -10)}
                    className="px-2 py-1 text-xs rounded border border-white/10 hover:bg-white/10"
                  >
                    -10%
                  </button>
                  <button
                    onClick={() => updateProgress(goal.id, 10)}
                    className="px-2 py-1 text-xs rounded border border-white/10 hover:bg-white/10"
                  >
                    +10%
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${activeTheme.card} ${activeTheme.bg} space-y-4 shadow-2xl`}>
            <h3 className="text-lg font-bold">Add New Target Countdown</h3>
            <form onSubmit={addGoal} className="space-y-3">
              <div>
                <label className="text-xs font-semibold opacity-80">Goal / Exam Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
                  placeholder="e.g. Organic Chemistry Final"
                />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-80">Target Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold opacity-80">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold opacity-80">Subject Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-white/10 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTheme.accent}`}
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. TASK CHECKLIST COMPONENT
// ==========================================
function TaskChecklistTab({ activeTheme, tasks, setTasks }) {
  const [filterSubject, setFilterSubject] = useState('All');
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('CS');
  const [newPriority, setNewPriority] = useState('High');
  const [newPomo, setNewPomo] = useState(2);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTitle) return;
    const newTask = {
      id: 't_' + Date.now(),
      title: newTitle,
      subject: newSubject,
      completed: false,
      priority: newPriority,
      pomodoros: Number(newPomo),
      dueDate: new Date().toISOString().split('T')[0]
    };
    setTasks([newTask, ...tasks]);
    setNewTitle('');
  };

  const subjects = ['All', ...new Set(tasks.map(t => t.subject))];
  const filteredTasks = filterSubject === 'All' ? tasks : tasks.filter(t => t.subject === filterSubject);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Interactive Task Checklist</h2>
        <p className="text-sm opacity-70">Organize your study goals by subject, estimated pomodoros, and priority.</p>
      </div>

      {/* Add Task Form */}
      <form onSubmit={addTask} className={`p-4 rounded-xl border ${activeTheme.card} ${activeTheme.border} grid grid-cols-1 md:grid-cols-12 gap-3 items-center`}>
        <input
          type="text"
          placeholder="What are you studying today?"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          className="md:col-span-5 px-3.5 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
        />
        <input
          type="text"
          placeholder="Subject"
          value={newSubject}
          onChange={e => setNewSubject(e.target.value)}
          className="md:col-span-2 px-3.5 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
        />
        <select
          value={newPriority}
          onChange={e => setNewPriority(e.target.value)}
          className="md:col-span-2 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
        >
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <div className="md:col-span-1 flex items-center space-x-1">
          <Clock className="w-4 h-4 opacity-50" />
          <input
            type="number"
            min="1"
            max="10"
            value={newPomo}
            onChange={e => setNewPomo(e.target.value)}
            className="w-full px-2 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none text-center"
          />
        </div>
        <button
          type="submit"
          className={`md:col-span-2 py-2 px-4 rounded-lg font-bold text-sm flex items-center justify-center space-x-2 ${activeTheme.accent}`}
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </form>

      {/* Subject Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {subjects.map(s => (
          <button
            key={s}
            onClick={() => setFilterSubject(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterSubject === s
                ? `${activeTheme.accent}`
                : 'bg-white/5 border border-white/10 opacity-70 hover:opacity-100'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 opacity-50 text-sm">No tasks found for this subject filter.</div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${activeTheme.card} ${activeTheme.border} ${
                task.completed ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                    task.completed
                      ? `${activeTheme.accent} border-transparent`
                      : 'border-white/30 hover:border-white/60'
                  }`}
                >
                  {task.completed && <Check className="w-3.5 h-3.5" />}
                </button>
                <div>
                  <p className={`text-sm font-medium ${task.completed ? 'line-through' : ''}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center space-x-3 mt-1 text-xs opacity-60">
                    <span className="font-semibold">{task.subject}</span>
                    <span>•</span>
                    <span>{task.pomodoros} Pomodoro{task.pomodoros > 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>Due: {task.dueDate}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-40 hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. PROGRESS ANALYTICS DASHBOARD
// ==========================================
function AnalyticsTab({ activeTheme, tasks, goals, totalStudyMinutes, streakDays }) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Mock weekly study time (hours)
  const weeklyData = [
    { day: 'Mon', hours: 2.5 },
    { day: 'Tue', hours: 3.8 },
    { day: 'Wed', hours: 4.2 },
    { day: 'Thu', hours: 1.5 },
    { day: 'Fri', hours: 5.0 },
    { day: 'Sat', hours: 3.0 },
    { day: 'Sun', hours: 2.0 }
  ];

  const maxHours = Math.max(...weeklyData.map(d => d.hours));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Progress & Focus Analytics</h2>
        <p className="text-sm opacity-70">Monitor your daily productivity performance and study streaks.</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Focus Time', value: `${Math.floor(totalStudyMinutes / 60)}h ${totalStudyMinutes % 60}m`, sub: 'Accumulated focus', icon: Clock },
          { title: 'Study Streak', value: `${streakDays} Days`, sub: 'Keep it going!', icon: Flame },
          { title: 'Tasks Finished', value: `${completedTasks}/${totalTasks}`, sub: `${taskCompletionRate}% completed`, icon: CheckSquare },
          { title: 'Active Targets', value: goals.length, sub: 'Target deadlines', icon: Target }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`p-5 rounded-2xl border ${activeTheme.card} ${activeTheme.border} space-y-2`}>
              <div className="flex justify-between items-center text-xs opacity-70">
                <span>{stat.title}</span>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold font-mono tracking-tight">{stat.value}</p>
              <p className="text-[11px] opacity-60">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Chart & Subject Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Bar Chart */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border ${activeTheme.card} ${activeTheme.border} space-y-4`}>
          <h3 className="font-bold text-base">Weekly Focus Breakdown</h3>
          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
            {weeklyData.map((d, i) => {
              const heightPercent = (d.hours / maxHours) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-mono opacity-70">{d.hours}h</span>
                  <div className="w-full bg-slate-700/30 rounded-t-lg h-full flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-t-lg ${activeTheme.accent} transition-all duration-500`}
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-semibold opacity-70">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subjects Breakdown */}
        <div className={`p-6 rounded-2xl border ${activeTheme.card} ${activeTheme.border} space-y-4`}>
          <h3 className="font-bold text-base">Subject Mastery</h3>
          <div className="space-y-4">
            {[
              { subject: 'Computer Science', hours: 42, color: 'bg-indigo-500' },
              { subject: 'Physics Mechanics', hours: 28, color: 'bg-emerald-500' },
              { subject: 'Organic Chemistry', hours: 18, color: 'bg-amber-500' },
              { subject: 'Literature & History', hours: 12, color: 'bg-purple-500' }
            ].map((s, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span>{s.subject}</span>
                  <span className="opacity-70">{s.hours} hours</span>
                </div>
                <div className="w-full bg-slate-700/30 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${s.color} rounded-full`}
                    style={{ width: `${(s.hours / 50) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. INTERACTIVE CALENDAR / PLANNER
// ==========================================
function CalendarTab({ activeTheme, events, setEvents }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 10, 1)); // Nov 2026
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate) return;
    setEvents([...events, { id: 'e_' + Date.now(), title: newEventTitle, date: newEventDate, color: '#ec4899' }]);
    setNewEventTitle('');
    setNewEventDate('');
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Interactive Calendar Planner</h2>
          <p className="text-sm opacity-70">Schedule study events, exams, and milestones.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className={`p-2 rounded-lg border ${activeTheme.border} ${activeTheme.card}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm min-w-[120px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className={`p-2 rounded-lg border ${activeTheme.border} ${activeTheme.card}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className={`lg:col-span-3 p-6 rounded-2xl border ${activeTheme.card} ${activeTheme.border}`}>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold opacity-70 mb-4">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={'empty-' + i} className="h-20 rounded-lg bg-black/10 opacity-20"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = events.filter(e => e.date === dateStr);

              return (
                <div key={dayNum} className={`h-20 p-1.5 rounded-lg border ${activeTheme.border} bg-black/10 flex flex-col justify-between overflow-hidden`}>
                  <span className="text-xs font-bold">{dayNum}</span>
                  <div className="space-y-1 overflow-y-auto">
                    {dayEvents.map(e => (
                      <div
                        key={e.id}
                        className="text-[10px] p-1 rounded font-medium truncate text-white"
                        style={{ backgroundColor: e.color || '#6366f1' }}
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Event Sidebar */}
        <div className={`p-6 rounded-2xl border ${activeTheme.card} ${activeTheme.border} space-y-4`}>
          <h3 className="font-bold text-base">Add Planner Event</h3>
          <form onSubmit={handleAddEvent} className="space-y-3">
            <div>
              <label className="text-xs font-semibold opacity-80">Event Name</label>
              <input
                type="text"
                required
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
                placeholder="Group Study"
              />
            </div>
            <div>
              <label className="text-xs font-semibold opacity-80">Date</label>
              <input
                type="date"
                required
                value={newEventDate}
                onChange={e => setNewEventDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className={`w-full py-2.5 rounded-lg font-bold text-sm ${activeTheme.accent}`}
            >
              Add Event
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <h4 className="text-xs font-bold opacity-70 uppercase tracking-wider">Upcoming Events</h4>
            {events.map(e => (
              <div key={e.id} className="text-xs p-2 rounded bg-white/5 border border-white/10 flex justify-between items-center">
                <span className="font-medium truncate">{e.title}</span>
                <span className="opacity-60 text-[10px]">{e.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. FLASHCARD DECK GENERATOR & VIEWER
// ==========================================
function FlashcardsTab({ activeTheme, decks, setDecks }) {
  const [selectedDeckId, setSelectedDeckId] = useState(decks[0]?.id || null);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckSubject, setNewDeckSubject] = useState('');

  const currentDeck = decks.find(d => d.id === selectedDeckId);
  const currentCard = currentDeck?.cards[cardIndex];

  const nextCard = () => {
    setIsFlipped(false);
    if (currentDeck) {
      setCardIndex((cardIndex + 1) % currentDeck.cards.length);
    }
  };

  const prevCard = () => {
    setIsFlipped(false);
    if (currentDeck) {
      setCardIndex((cardIndex - 1 + currentDeck.cards.length) % currentDeck.cards.length);
    }
  };

  const createDeck = (e) => {
    e.preventDefault();
    if (!newDeckTitle) return;
    const deck = {
      id: 'd_' + Date.now(),
      title: newDeckTitle,
      subject: newDeckSubject || 'General',
      cards: [
        { id: 'c_' + Date.now(), front: 'Sample Question Front side', back: 'Sample Answer Back side' }
      ]
    };
    setDecks([...decks, deck]);
    setSelectedDeckId(deck.id);
    setNewDeckTitle('');
    setNewDeckSubject('');
    setShowDeckModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Flashcard Decks & SRS Practice</h2>
          <p className="text-sm opacity-70">Memorize key terms and active recall flashcards.</p>
        </div>
        <button
          onClick={() => setShowDeckModal(true)}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2 ${activeTheme.accent}`}
        >
          <Plus className="w-4 h-4" />
          <span>New Deck</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Deck Selector Sidebar */}
        <div className="space-y-2">
          {decks.map(deck => (
            <button
              key={deck.id}
              onClick={() => { setSelectedDeckId(deck.id); setCardIndex(0); setIsFlipped(false); }}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                selectedDeckId === deck.id
                  ? `${activeTheme.accent} ${activeTheme.glow}`
                  : `${activeTheme.card} ${activeTheme.border} hover:bg-white/5`
              }`}
            >
              <h4 className="font-bold text-sm">{deck.title}</h4>
              <p className="text-xs opacity-70 mt-1">{deck.cards.length} Flashcards • {deck.subject}</p>
            </button>
          ))}
        </div>

        {/* Card Viewer */}
        <div className="md:col-span-3 space-y-4">
          {currentDeck && currentCard ? (
            <div className="space-y-4">
              {/* Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`h-72 rounded-2xl border cursor-pointer p-8 flex flex-col items-center justify-center text-center transition-all duration-500 transform hover:scale-[1.01] ${activeTheme.card} ${activeTheme.border} ${activeTheme.glow}`}
              >
                <span className="text-xs uppercase tracking-widest opacity-50 font-bold mb-4">
                  {isFlipped ? 'ANSWER (BACK)' : 'QUESTION (FRONT)'}
                </span>
                <p className="text-xl md:text-2xl font-medium leading-relaxed">
                  {isFlipped ? currentCard.back : currentCard.front}
                </p>
                <span className="text-xs opacity-40 mt-6">(Click card to flip)</span>
              </div>

              {/* Navigation & Ratings */}
              <div className="flex justify-between items-center">
                <button
                  onClick={prevCard}
                  className={`p-3 rounded-xl border ${activeTheme.border} ${activeTheme.card}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-mono opacity-70">
                  Card {cardIndex + 1} of {currentDeck.cards.length}
                </span>
                <button
                  onClick={nextCard}
                  className={`p-3 rounded-xl border ${activeTheme.border} ${activeTheme.card}`}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center opacity-50 border rounded-2xl">No deck selected.</div>
          )}
        </div>
      </div>

      {/* New Deck Modal */}
      {showDeckModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${activeTheme.card} ${activeTheme.bg} space-y-4 shadow-2xl`}>
            <h3 className="text-lg font-bold">Create Flashcard Deck</h3>
            <form onSubmit={createDeck} className="space-y-3">
              <div>
                <label className="text-xs font-semibold opacity-80">Deck Title</label>
                <input
                  type="text"
                  required
                  value={newDeckTitle}
                  onChange={e => setNewDeckTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
                  placeholder="e.g. CS 101 Formulas"
                />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-80">Subject Category</label>
                <input
                  type="text"
                  value={newDeckSubject}
                  onChange={e => setNewDeckSubject(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none"
                  placeholder="CS"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDeckModal(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-white/10 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTheme.accent}`}
                >
                  Create Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 7. ASSESSMENTS & QUIZ CREATOR
// ==========================================
function QuizzesTab({ activeTheme, quizzes, setQuizzes }) {
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setUserAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  const selectAnswer = (qId, optionIdx) => {
    if (submitted) return;
    setUserAnswers({ ...userAnswers, [qId]: optionIdx });
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    let calculated = 0;
    activeQuiz.questions.forEach(q => {
      if (userAnswers[q.id] === q.correctIndex) calculated += 1;
    });
    setScore(calculated);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Assessments & Timed Quizzes</h2>
        <p className="text-sm opacity-70">Test your knowledge with self-assessments and answer breakdowns.</p>
      </div>

      {!activeQuiz ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className={`p-6 rounded-2xl border ${activeTheme.card} ${activeTheme.border} space-y-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-60">{quiz.subject}</span>
                  <h3 className="text-lg font-bold">{quiz.title}</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/10">
                  {quiz.questions.length} Questions
                </span>
              </div>
              <p className="text-xs opacity-70">Time Limit: {quiz.timeLimit} Minutes</p>
              <button
                onClick={() => startQuiz(quiz)}
                className={`w-full py-2.5 rounded-xl font-bold text-sm ${activeTheme.accent}`}
              >
                Start Assessment
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-6 md:p-8 rounded-2xl border ${activeTheme.card} ${activeTheme.border} space-y-6`}>
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-bold">{activeQuiz.title}</h3>
              <p className="text-xs opacity-70">Answer all questions and submit for scoring.</p>
            </div>
            <button
              onClick={() => setActiveQuiz(null)}
              className="px-3 py-1.5 rounded-lg text-xs border border-white/10 hover:bg-white/10"
            >
              Exit Quiz
            </button>
          </div>

          {/* Question List */}
          <div className="space-y-6">
            {activeQuiz.questions.map((q, idx) => (
              <div key={q.id} className="space-y-3 bg-black/20 p-4 rounded-xl">
                <p className="font-semibold text-sm">{idx + 1}. {q.text}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userAnswers[q.id] === optIdx;
                    const isCorrect = q.correctIndex === optIdx;
                    let btnStyle = 'bg-white/5 border-white/10 opacity-80';

                    if (submitted) {
                      if (isCorrect) btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold';
                      else if (isSelected && !isCorrect) btnStyle = 'bg-red-500/20 border-red-500 text-red-400';
                    } else if (isSelected) {
                      btnStyle = `${activeTheme.accent} font-bold`;
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => selectAnswer(q.id, optIdx)}
                        className={`p-3 rounded-lg border text-xs text-left transition-all ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Result Footer */}
          {!submitted ? (
            <button
              onClick={handleSubmitQuiz}
              className={`w-full py-3 rounded-xl font-bold text-base ${activeTheme.accent}`}
            >
              Submit Quiz Answers
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-center space-y-2">
              <h4 className="text-lg font-bold">Quiz Complete! Score: {score} / {activeQuiz.questions.length}</h4>
              <p className="text-xs opacity-80">Percentage: {Math.round((score / activeQuiz.questions.length) * 100)}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 8. COURSE NOTEBOOK & MODULES
// ==========================================
function CourseNotebookTab({ activeTheme, modules, setModules }) {
  const [selectedModId, setSelectedModId] = useState(modules[0]?.id || null);
  const activeModule = modules.find(m => m.id === selectedModId);

  const [notesText, setNotesText] = useState(activeModule?.notes || '');

  useEffect(() => {
    if (activeModule) setNotesText(activeModule.notes);
  }, [selectedModId]);

  const saveNotes = () => {
    setModules(modules.map(m => m.id === selectedModId ? { ...m, notes: notesText } : m));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Learning Modules & Course Notebook</h2>
        <p className="text-sm opacity-70">Organize subject notes, active recall prompts, and resource links.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Module List Sidebar */}
        <div className="space-y-2">
          {modules.map(mod => (
            <button
              key={mod.id}
              onClick={() => setSelectedModId(mod.id)}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                selectedModId === mod.id
                  ? `${activeTheme.accent} ${activeTheme.glow}`
                  : `${activeTheme.card} ${activeTheme.border} hover:bg-white/5`
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">{mod.code}</span>
              <h4 className="font-bold text-sm">{mod.title}</h4>
            </button>
          ))}
        </div>

        {/* Notebook Main Editor */}
        <div className="lg:col-span-3 space-y-4">
          {activeModule ? (
            <div className={`p-6 rounded-2xl border ${activeTheme.card} ${activeTheme.border} space-y-6`}>
              <div>
                <span className="text-xs font-bold opacity-60">{activeModule.code}</span>
                <h3 className="text-xl font-bold">{activeModule.title}</h3>
              </div>

              {/* Notes Editor */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold opacity-80">Course Summary & Notes</label>
                  <button
                    onClick={saveNotes}
                    className={`px-3 py-1 rounded text-xs font-bold ${activeTheme.accent}`}
                  >
                    Save Notes
                  </button>
                </div>
                <textarea
                  rows="6"
                  value={notesText}
                  onChange={e => setNotesText(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-black/30 border border-white/10 text-sm focus:outline-none font-mono leading-relaxed"
                ></textarea>
              </div>

              {/* Active Recall Prompts */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold opacity-80 uppercase tracking-wider">Active Recall Questions</h4>
                <div className="space-y-2">
                  {activeModule.activeRecall.map((prompt, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs font-medium">
                      💡 {prompt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center opacity-50 border rounded-2xl">No module selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 9. THEME SWITCHER & PERSONALIZATION
// ==========================================
function ThemesTab({ currentThemeKey, setCurrentThemeKey, activeTheme }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Theme Switcher & Personalization</h2>
        <p className="text-sm opacity-70">Customize your visual workspace aesthetic and theme colors.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(themes).map(([key, theme]) => {
          const isActive = currentThemeKey === key;
          return (
            <div
              key={key}
              onClick={() => setCurrentThemeKey(key)}
              className={`p-6 rounded-2xl border cursor-pointer transition-all duration-200 ${
                isActive ? 'ring-2 ring-offset-2 ring-emerald-400 scale-[1.02]' : 'hover:scale-[1.01]'
              } ${theme.bg} ${theme.border} ${theme.glow}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base">{theme.name}</h3>
                {isActive && <Check className="w-5 h-5 text-emerald-400" />}
              </div>

              <div className="flex space-x-2">
                <div className={`w-8 h-8 rounded-full ${theme.accent}`}></div>
                <div className={`w-8 h-8 rounded-full ${theme.card} border ${theme.border}`}></div>
                <div className={`w-8 h-8 rounded-full ${theme.sidebar} border ${theme.border}`}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}