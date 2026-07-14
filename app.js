// CPU Scheduling Simulator & Visualizer - Main Controller & Engines

// --- STATE MANAGEMENT ---
let processes = [];
let processCounter = 0;
let selectedAlgo = 'fcfs';
let timeQuantum = 2;
let agingEnabled = false;
let agingRate = 5;

// --- QUIZ STATE MANAGEMENT ---
let quizMode = false;
let quizCurrentTime = 0;
let quizIndex = 0;
let quizDecisionPoints = [];
let quizCorrectCount = 0;
let quizTotalQuestions = 0;
let quizFeedbackActive = false;

// Playback timeline snapshot cache
let timeline = [];
let maxTime = 0;
let currentTime = 0;
let isPlaying = false;
let playIntervalId = null;
let playbackSpeedMs = 1000; // 1s per tick default

// Colors for process IDs
const processColors = [
  'p-color-1',
  'p-color-2',
  'p-color-3',
  'p-color-4',
  'p-color-5',
  'p-color-6',
  'p-color-7',
  'p-color-8'
];

// --- DOM ELEMENTS ---
const algoSelect = document.getElementById('algo-select');
const quantumContainer = document.getElementById('quantum-container');
const timeQuantumInput = document.getElementById('time-quantum');
const agingContainer = document.getElementById('aging-container');
const enableAgingInput = document.getElementById('enable-aging');
const agingThresholdWrapper = document.getElementById('aging-threshold-wrapper');
const agingThresholdInput = document.getElementById('aging-threshold');
const arrivalInput = document.getElementById('arrival-time');
const burstInput = document.getElementById('burst-time');
const priorityInput = document.getElementById('priority-val');
const priorityContainer = document.getElementById('priority-container');
const btnAddProcess = document.getElementById('btn-add-process');
const btnAddRandom = document.getElementById('btn-add-random');
const processTableBody = document.querySelector('#process-table tbody');

const btnStepPrev = document.getElementById('btn-step-prev');
const btnPlayPause = document.getElementById('btn-play-pause');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const playText = document.getElementById('play-text');
const btnStepNext = document.getElementById('btn-step-next');
const btnReset = document.getElementById('btn-reset');
const speedSlider = document.getElementById('speed-slider');
const currentTimeDisplay = document.getElementById('current-time');

const readyItemsContainer = document.getElementById('ready-items');
const readyCountBadge = document.getElementById('ready-count');
const cpuSlot = document.getElementById('cpu-slot');
const completedItemsContainer = document.getElementById('completed-items');
const completedCountBadge = document.getElementById('completed-count');

const ganttChart = document.getElementById('gantt-chart');
const ganttTicks = document.getElementById('gantt-ticks');

const valAvgWt = document.getElementById('val-avg-wt');
const valAvgTat = document.getElementById('val-avg-tat');
const valAvgRt = document.getElementById('val-avg-rt');
const valCpuUtil = document.getElementById('val-cpu-util');

const wtComparisonChart = document.getElementById('wt-comparison-chart');
const tatComparisonChart = document.getElementById('tat-comparison-chart');

const educationBanner = document.getElementById('education-banner');
const eduTitle = document.getElementById('edu-title');
const eduText = document.getElementById('edu-text');

// Quiz Mode DOM elements
const modeAuto = document.getElementById('mode-auto');
const modeQuiz = document.getElementById('mode-quiz');
const quizPanel = document.getElementById('quiz-panel');
const quizScoreCorrect = document.getElementById('quiz-score-correct');
const quizScoreTotal = document.getElementById('quiz-score-total');
const quizPromptText = document.getElementById('quiz-prompt-text');
const quizOptions = document.getElementById('quiz-options');
const quizFeedback = document.getElementById('quiz-feedback');
const btnQuizReset = document.getElementById('btn-quiz-reset');

// Educational commentary data
const algoEducationInfo = {
  fcfs: {
    title: "First-Come First-Served (FCFS)",
    text: "This algorithm is non-preemptive. The CPU executes processes in the order they arrive. While simple, FCFS can suffer from the 'Convoy Effect' where small processes wait a long time behind a large process, leading to high average waiting times."
  },
  'sjf-np': {
    title: "Shortest Job First (SJF - Non-Preemptive)",
    text: "SJF selects the process with the shortest burst time currently in the ready queue. Being non-preemptive, once started, it runs until finished. SJF is optimal as it minimizes average waiting times, but it requires knowing burst times in advance."
  },
  'sjf-p': {
    title: "Shortest Remaining Time First (SRTF - Preemptive)",
    text: "SRTF is the preemptive version of SJF. If a new process arrives with a remaining burst time shorter than the current running process's remaining time, the CPU preempts the current process. This achieves the lowest possible waiting times but increases context switching."
  },
  rr: {
    title: "Round Robin (RR)",
    text: "RR is designed for time-sharing systems. Each process is given a small time slice (Time Quantum). If it doesn't finish, it's preempted and placed at the back of the ready queue. The size of the Time Quantum is critical: too small causes excessive context switching; too large turns it into FCFS."
  },
  'priority-np': {
    title: "Priority Scheduling (Non-Preemptive)",
    text: "Processes are allocated CPU based on priority levels (here, lower values represent higher priority). In the non-preemptive variant, once a high-priority process starts, it runs to completion. A major disadvantage is 'Starvation', where low-priority tasks wait indefinitely."
  },
  'priority-p': {
    title: "Priority Scheduling (Preemptive)",
    text: "Preemptive priority scheduling immediately interrupts the current process if a new arrival has a higher priority (lower priority number). This ensures critical tasks run instantly, but increases preemptions and risk of starvation for background tasks."
  }
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadDefaultProcesses();
  triggerCalculation();
});

function setupEventListeners() {
  // Algorithm selection change
  algoSelect.addEventListener('change', (e) => {
    selectedAlgo = e.target.value;
    
    // Toggle quantum input visibility
    if (selectedAlgo === 'rr') {
      quantumContainer.style.display = 'flex';
    } else {
      quantumContainer.style.display = 'none';
    }
    
    // Toggle priority container & aging container visibility
    if (selectedAlgo.startsWith('priority')) {
      priorityContainer.style.visibility = 'visible';
      agingContainer.style.display = 'block';
      toggleAgingThresholdVisibility();
    } else {
      priorityContainer.style.visibility = 'hidden';
      agingContainer.style.display = 'none';
    }

    // Update education text
    updateEducationBanner();
    
    // Recalculate simulation timeline
    triggerCalculation();
  });

  // Enable Aging checkbox change
  enableAgingInput.addEventListener('change', (e) => {
    agingEnabled = e.target.checked;
    toggleAgingThresholdVisibility();
    triggerCalculation();
  });

  // Aging threshold rate input change
  agingThresholdInput.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;
    agingRate = val;
    triggerCalculation();
  });

  // Time Quantum input change
  timeQuantumInput.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;
    timeQuantum = val;
    triggerCalculation();
  });

  // Form submission (Add Process)
  btnAddProcess.addEventListener('click', (e) => {
    e.preventDefault();
    const arrival = parseInt(arrivalInput.value);
    const burst = parseInt(burstInput.value);
    const priority = parseInt(priorityInput.value);
    
    if (isNaN(arrival) || arrival < 0 || isNaN(burst) || burst <= 0) {
      alert("Please enter valid Arrival and Burst times.");
      return;
    }
    
    addProcess(arrival, burst, priority);
    triggerCalculation();
  });

  // Random Process generator button
  btnAddRandom.addEventListener('click', () => {
    const arrival = Math.floor(Math.random() * 8);
    const burst = Math.floor(Math.random() * 8) + 1; // 1 to 8
    const priority = Math.floor(Math.random() * 5) + 1; // 1 to 5
    addProcess(arrival, burst, priority);
    triggerCalculation();
  });

  // Presets load listeners
  document.getElementById('preset-convoy').addEventListener('click', () => loadPreset('convoy'));
  document.getElementById('preset-starve').addEventListener('click', () => loadPreset('starve'));
  document.getElementById('preset-quantum').addEventListener('click', () => loadPreset('quantum'));
  document.getElementById('preset-priority').addEventListener('click', () => loadPreset('priority'));

  // Player controls
  btnPlayPause.addEventListener('click', togglePlay);
  btnStepPrev.addEventListener('click', stepBackward);
  btnStepNext.addEventListener('click', stepForward);
  btnReset.addEventListener('click', resetSimulation);
  
  // Speed slider
  speedSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    // map slider value 1-5 to speed milliseconds (5 is fast -> 200ms, 1 is slow -> 1500ms)
    const speeds = [1500, 1000, 600, 300, 100];
    playbackSpeedMs = speeds[val - 1];
    
    if (isPlaying) {
      pauseTimeline();
      playTimeline();
    }
  });

  // Learn Hub Tab switching
  const learnTabs = document.querySelectorAll('.learn-tab');
  const learnTabContents = document.querySelectorAll('.learn-tab-content');
  
  learnTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      learnTabs.forEach(t => t.classList.remove('active'));
      learnTabContents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      const contentId = `tab-${tab.dataset.tab}`;
      document.getElementById(contentId).classList.add('active');
    });
  });

  // Mode Selection Tabs
  modeAuto.addEventListener('click', () => {
    modeAuto.classList.add('active');
    modeQuiz.classList.remove('active');
    exitQuiz();
  });

  modeQuiz.addEventListener('click', () => {
    modeQuiz.classList.add('active');
    modeAuto.classList.remove('active');
    initQuiz();
  });

  // Quiz Reset button
  btnQuizReset.addEventListener('click', () => {
    initQuiz();
  });
}

function toggleAgingThresholdVisibility() {
  if (agingEnabled && selectedAlgo.startsWith('priority')) {
    agingThresholdWrapper.style.display = 'flex';
  } else {
    agingThresholdWrapper.style.display = 'none';
  }
}

// --- PROCESS MANAGEMENT ---
function addProcess(arrival, burst, priority) {
  if (processes.length >= 8) {
    alert("Maximum of 8 processes reached for visualization clarity.");
    return;
  }
  processCounter++;
  const colorIndex = (processCounter - 1) % processColors.length;
  
  processes.push({
    id: `P${processCounter}`,
    arrival: arrival,
    burst: burst,
    priority: priority,
    colorClass: processColors[colorIndex]
  });
  
  renderProcessTable();
}

function removeProcess(index) {
  processes.splice(index, 1);
  // After deletion, reassign IDs sequentially to prevent gaps like P1, P3, P4
  processes.forEach((p, i) => {
    p.id = `P${i + 1}`;
    p.colorClass = processColors[i % processColors.length];
  });
  // Reset counter to match actual count so next addition is always sequential
  processCounter = processes.length;
  renderProcessTable();
  triggerCalculation();
}

function renderProcessTable() {
  processTableBody.innerHTML = '';
  processes.forEach((p, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="p-pill ${p.colorClass}">${p.id}</span></td>
      <td>${p.arrival}s</td>
      <td>${p.burst}s</td>
      <td>${p.priority}</td>
      <td>
        <button class="btn btn-danger" onclick="removeProcess(${idx})" style="padding: 4px 8px; font-size: 11px;">Delete</button>
      </td>
    `;
    processTableBody.appendChild(row);
  });
}

function loadDefaultProcesses() {
  processes = [];
  processCounter = 0;
  addProcess(0, 5, 2);
  addProcess(1, 3, 1);
  addProcess(3, 4, 3);
  addProcess(5, 2, 2);
}

// --- EDUCATIONAL PRESETS ---
function loadPreset(presetName) {
  resetSimulation();
  processes = [];
  // Don't reset processCounter to 0 — derive it from the current max to avoid PID reuse across sessions.
  // But since this is a fresh load from a preset, reset is expected:
  processCounter = 0;
  
  if (presetName === 'convoy') {
    // Large process first, then small ones
    selectedAlgo = 'fcfs';
    algoSelect.value = 'fcfs';
    quantumContainer.style.display = 'none';
    priorityContainer.style.visibility = 'hidden';
    
    addProcess(0, 20, 3);
    addProcess(1, 2, 2);
    addProcess(2, 2, 1);
  } 
  else if (presetName === 'starve') {
    // SRTF starvation of P1
    selectedAlgo = 'sjf-p';
    algoSelect.value = 'sjf-p';
    quantumContainer.style.display = 'none';
    priorityContainer.style.visibility = 'hidden';
    
    addProcess(0, 12, 3); // Long process
    addProcess(2, 2, 1);
    addProcess(4, 2, 1);
    addProcess(6, 2, 1);
    addProcess(8, 2, 1);
  }
  else if (presetName === 'quantum') {
    // RR with high quantum or low quantum switches
    selectedAlgo = 'rr';
    algoSelect.value = 'rr';
    timeQuantum = 2;
    timeQuantumInput.value = 2;
    quantumContainer.style.display = 'flex';
    priorityContainer.style.visibility = 'hidden';
    
    addProcess(0, 7, 2);
    addProcess(1, 4, 1);
    addProcess(3, 8, 3);
  }
  else if (presetName === 'priority') {
    // High priority preempting low priority
    selectedAlgo = 'priority-p';
    algoSelect.value = 'priority-p';
    quantumContainer.style.display = 'none';
    priorityContainer.style.visibility = 'visible';
    
    addProcess(0, 8, 3); // low priority arrives first
    addProcess(2, 4, 1); // high priority interrupts
    addProcess(4, 5, 2); // medium priority
  }
  
  updateEducationBanner();
  triggerCalculation();
}

function updateEducationBanner() {
  const info = algoEducationInfo[selectedAlgo];
  if (info) {
    eduTitle.innerText = info.title;
    eduText.innerText = info.text;
  }
}

// Global hook to access removeProcess from onclick in dynamic HTML
window.removeProcess = removeProcess;

// --- SIMULATION CALCULATORS (CORE ALGORITHMS) ---
function triggerCalculation() {
  resetSimulation();
  
  if (processes.length === 0) {
    clearVisualization();
    return;
  }
  
  // Calculate simulation timeline snapshot list
  const result = runScheduler(processes, selectedAlgo, timeQuantum, agingEnabled, agingRate);
  timeline = result.timeline;
  maxTime = result.maxTime;
  
  // Update UI components with computed metrics
  updateMetricsDisplay(result.metrics);
  
  if (quizMode) {
    renderComparisonCharts();
    // Initialize or refresh quiz data
    quizDecisionPoints = getDecisionPoints(timeline, processes, selectedAlgo, timeQuantum);
    quizIndex = 0;
    quizFeedbackActive = false;
    const firstTime = quizDecisionPoints[0] || 0;
    renderQuizTimeStep(firstTime);
    showQuizQuestion(firstTime);
  } else {
    renderGanttChart(result.ganttBlocks, maxTime);
    renderComparisonCharts();
    // Display initial snapshot
    renderTimeStep(0);
  }
}

function runScheduler(processList, algo, quantum, agingEnabled = false, agingThreshold = 5) {
  // Deep copy process list to avoid messing up inputs
  const jobQueue = processList.map(p => ({
    id: p.id,
    arrival: p.arrival,
    burst: p.burst,
    priority: p.priority,
    originalPriority: p.priority,
    colorClass: p.colorClass,
    remainingBurst: p.burst,
    waitTimeInQueue: 0,
    firstResponseTime: -1,
    completionTime: -1,
    turnaroundTime: -1,
    waitingTime: -1,
    responseTime: -1
  }));

  const timeline = [];
  const ganttBlocks = [];
  
  let t = 0;
  let activeJob = null;
  let rrQuantumTime = 0;
  
  // Custom ready queue structure
  let readyQueue = [];
  
  // Complete jobs tracking
  const completedJobs = [];
  
  // Track which jobs have already been enqueued so we don't add them twice
  const enqueuedIds = new Set();
  
  // We run until all jobs are completely processed
  while (completedJobs.length < jobQueue.length) {
    // 1. Fetch new arrivals at time t (only jobs not yet in any queue/running/done)
    const newArrivals = jobQueue.filter(j =>
      j.arrival === t &&
      !enqueuedIds.has(j.id) &&
      !completedJobs.find(c => c.id === j.id) &&
      (activeJob ? activeJob.id !== j.id : true)
    );
    
    // Sort arrivals by ID to maintain a consistent load order
    newArrivals.sort((a, b) => a.id.localeCompare(b.id));
    
    // Add new arrivals to Ready Queue and mark as enqueued
    newArrivals.forEach(j => {
      readyQueue.push(j);
      enqueuedIds.add(j.id);
    });

    // 1.5. Apply aging if enabled (only for priority schedulers)
    if (agingEnabled && (algo === 'priority-np' || algo === 'priority-p')) {
      readyQueue.forEach(job => {
        // Incremented wait time for all jobs currently in ready queue at this tick:
        job.waitTimeInQueue++;
        if (job.waitTimeInQueue >= agingThreshold) {
          job.priority++; // increase value = increase priority
          job.waitTimeInQueue = 0; // reset wait timer
        }
      });
    }
    
    // 2. Decide scheduler step based on chosen algorithm
    if (algo === 'fcfs') {
      if (!activeJob && readyQueue.length > 0) {
        activeJob = readyQueue.shift();
      }
    } 
    else if (algo === 'sjf-np') {
      // Non-Preemptive SJF: only pick a new job if current CPU is idle
      if (!activeJob && readyQueue.length > 0) {
        // Sort ready queue by burst time. Tie breaker: arrival time, then ID
        readyQueue.sort((a, b) => {
          if (a.burst !== b.burst) return a.burst - b.burst;
          if (a.arrival !== b.arrival) return a.arrival - b.arrival;
          return a.id.localeCompare(b.id);
        });
        activeJob = readyQueue.shift();
      }
    } 
    else if (algo === 'sjf-p') {
      // Preemptive SJF (SRTF)
      // Check if we need to preempt. Combine activeJob with ready queue to pick the shortest remaining burst.
      if (activeJob) {
        readyQueue.push(activeJob);
        activeJob = null;
      }
      if (readyQueue.length > 0) {
        readyQueue.sort((a, b) => {
          if (a.remainingBurst !== b.remainingBurst) return a.remainingBurst - b.remainingBurst;
          if (a.arrival !== b.arrival) return a.arrival - b.arrival;
          return a.id.localeCompare(b.id);
        });
        activeJob = readyQueue.shift();
      }
    } 
    else if (algo === 'rr') {
      // Round Robin
      // Preempt if quantum exceeded
      if (activeJob && rrQuantumTime >= quantum) {
        // Push current active job back to the queue (after new arrivals have already been pushed)
        readyQueue.push(activeJob);
        activeJob = null;
      }
      
      // Select next job if CPU is idle
      if (!activeJob && readyQueue.length > 0) {
        activeJob = readyQueue.shift();
        rrQuantumTime = 0;
      }
    } 
    else if (algo === 'priority-np') {
      // Non-Preemptive Priority (Lower priority number = Higher Priority)
      // Pick the highest priority job whenever the CPU is idle.
      // Sorting must happen each time CPU becomes free to respect current priorities (inc. aged ones).
      if (!activeJob && readyQueue.length > 0) {
        readyQueue.sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          if (a.arrival !== b.arrival) return a.arrival - b.arrival;
          return a.id.localeCompare(b.id);
        });
        activeJob = readyQueue.shift();
      }
    } 
    else if (algo === 'priority-p') {
      // Preemptive Priority
      if (activeJob) {
        readyQueue.push(activeJob);
        activeJob = null;
      }
      if (readyQueue.length > 0) {
        readyQueue.sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          if (a.arrival !== b.arrival) return a.arrival - b.arrival;
          return a.id.localeCompare(b.id);
        });
        activeJob = readyQueue.shift();
      }
    }

    // 3. Record snapshot state at time t
    const snapshot = {
      time: t,
      activeId: activeJob ? activeJob.id : null,
      activeColor: activeJob ? activeJob.colorClass : 'p-color-idle',
      readyQueueIds: readyQueue.map(q => q.id),
      completedIds: completedJobs.map(c => c.id),
      remainingBursts: {},
      priorities: {}
    };
    jobQueue.forEach(j => {
      snapshot.remainingBursts[j.id] = j.remainingBurst;
      snapshot.priorities[j.id] = j.priority;
    });
    timeline.push(snapshot);

    // 4. Tick and run active job for 1 second
    if (activeJob) {
      // Record response time on first scheduling
      if (activeJob.firstResponseTime === -1) {
        activeJob.firstResponseTime = t;
      }
      
      // Gantt Block recorder
      if (ganttBlocks.length > 0 && ganttBlocks[ganttBlocks.length - 1].id === activeJob.id) {
        ganttBlocks[ganttBlocks.length - 1].duration++;
      } else {
        ganttBlocks.push({
          id: activeJob.id,
          colorClass: activeJob.colorClass,
          startTime: t,
          duration: 1
        });
      }

      activeJob.remainingBurst--;
      rrQuantumTime++;
      
      // If completed, clean up
      if (activeJob.remainingBurst === 0) {
        activeJob.completionTime = t + 1;
        activeJob.turnaroundTime = activeJob.completionTime - activeJob.arrival;
        activeJob.waitingTime = activeJob.turnaroundTime - activeJob.burst;
        activeJob.responseTime = activeJob.firstResponseTime - activeJob.arrival;
        
        completedJobs.push(activeJob);
        activeJob = null;
      }
    } else {
      // Idle CPU tick
      if (ganttBlocks.length > 0 && ganttBlocks[ganttBlocks.length - 1].id === 'IDLE') {
        ganttBlocks[ganttBlocks.length - 1].duration++;
      } else {
        ganttBlocks.push({
          id: 'IDLE',
          colorClass: 'p-color-idle',
          startTime: t,
          duration: 1
        });
      }
    }
    
    t++;
  }

  // Record final completion status snapshot
  timeline.push({
    time: t,
    activeId: null,
    activeColor: 'p-color-idle',
    readyQueueIds: [],
    completedIds: completedJobs.map(c => c.id),
    remainingBursts: jobQueue.reduce((acc, curr) => {
      acc[curr.id] = 0;
      return acc;
    }, {}),
    priorities: jobQueue.reduce((acc, curr) => {
      acc[curr.id] = curr.priority;
      return acc;
    }, {})
  });

  // Calculate Average metrics
  let totalWt = 0, totalTat = 0, totalRt = 0;
  completedJobs.forEach(job => {
    totalWt += job.waitingTime;
    totalTat += job.turnaroundTime;
    totalRt += job.responseTime;
  });
  
  const metrics = {
    avgWt: totalWt / jobQueue.length,
    avgTat: totalTat / jobQueue.length,
    avgRt: totalRt / jobQueue.length,
    cpuUtil: calculateCpuUtilization(ganttBlocks, t)
  };

  return { timeline, ganttBlocks, maxTime: t, metrics };
}

function calculateCpuUtilization(ganttBlocks, totalDuration) {
  const idleBlock = ganttBlocks.find(b => b.id === 'IDLE');
  const idleDuration = ganttBlocks
    .filter(b => b.id === 'IDLE')
    .reduce((acc, curr) => acc + curr.duration, 0);
  
  return totalDuration > 0 ? Math.round(((totalDuration - idleDuration) / totalDuration) * 100) : 100;
}

// --- RENDER VISUALIZATION PER SNAPSHOT ---
function renderTimeStep(timeIndex) {
  if (timeline.length === 0 || timeIndex >= timeline.length) return;
  
  currentTime = timeIndex;
  currentTimeDisplay.innerText = currentTime;
  
  const state = timeline[currentTime];
  
  // 1. Render Ready Queue items
  readyItemsContainer.innerHTML = '';
  readyCountBadge.innerText = state.readyQueueIds.length;
  
  if (state.readyQueueIds.length === 0) {
    readyItemsContainer.innerHTML = `<div style="font-size: 12px; color: var(--text-light); text-align: center; width: 100%; margin-top: 10px;">Queue Empty</div>`;
  } else {
    state.readyQueueIds.forEach(id => {
      const p = processes.find(proc => proc.id === id);
      if (p) {
        const item = document.createElement('div');
        item.className = `p-block ${p.colorClass}`;
        const rem = state.remainingBursts[p.id];
        
        let priorityIndicator = '';
        if (state.priorities && state.priorities[p.id] !== undefined) {
          const currentPriority = state.priorities[p.id];
          const originalPriority = p.priority;
          if (currentPriority < originalPriority) {
            priorityIndicator = ` <span class="aged-badge" title="Original: ${originalPriority}">Aged: ${currentPriority}</span>`;
          } else if (selectedAlgo.startsWith('priority')) {
            priorityIndicator = ` <span style="font-size: 10px; margin-left: 6px; opacity: 0.8;">Pri: ${currentPriority}</span>`;
          }
        }
        
        item.innerHTML = `${p.id} <span>Rem: ${rem}s</span>${priorityIndicator}`;
        readyItemsContainer.appendChild(item);
      }
    });
  }
  
  // 2. Render CPU Slot status
  if (state.activeId) {
    const p = processes.find(proc => proc.id === state.activeId);
    let priText = '';
    if (state.priorities && state.priorities[state.activeId] !== undefined && selectedAlgo.startsWith('priority')) {
      const currentPriority = state.priorities[state.activeId];
      if (currentPriority < p.priority) {
        priText = ` (${state.activeId} [Aged Priority: ${currentPriority}])`;
      } else {
        priText = ` (${state.activeId} [Pri: ${currentPriority}])`;
      }
    } else {
      priText = ` (${state.activeId})`;
    }
    cpuSlot.innerText = `Running${priText}`;
    cpuSlot.className = `cpu-core-slot active ${state.activeColor}`;
  } else {
    cpuSlot.innerText = 'IDLE';
    cpuSlot.className = 'cpu-core-slot';
  }
  
  // 3. Render Terminated Completed List
  completedItemsContainer.innerHTML = '';
  completedCountBadge.innerText = state.completedIds.length;
  
  state.completedIds.forEach(id => {
    const p = processes.find(proc => proc.id === id);
    if (p) {
      const item = document.createElement('div');
      item.className = `p-block ${p.colorClass}`;
      item.style.opacity = '0.6';
      item.innerHTML = `${p.id} <span>Done</span>`;
      completedItemsContainer.appendChild(item);
    }
  });

  // 4. Highlight current segment in Gantt Chart
  const blocks = ganttChart.querySelectorAll('.gantt-block');
  blocks.forEach(b => {
    const start = parseInt(b.dataset.start);
    const end = start + parseInt(b.dataset.duration);
    if (currentTime >= start && currentTime < end && b.dataset.id !== 'IDLE') {
      b.style.boxShadow = 'inset 0 0 0 3px var(--accent-primary), 0 4px 10px rgba(0,0,0,0.1)';
      b.style.transform = 'translateY(-2px)';
    } else {
      b.style.boxShadow = 'none';
      b.style.transform = 'none';
    }
  });
}

// --- GANTT CHART BUILDER ---
function renderGanttChart(ganttBlocks, totalDuration) {
  ganttChart.innerHTML = '';
  ganttTicks.innerHTML = '';
  
  // Total width ratio helper
  ganttBlocks.forEach((block) => {
    const el = document.createElement('div');
    el.className = `gantt-block ${block.colorClass}`;
    // calculate width based on duration ratio
    const pct = (block.duration / totalDuration) * 100;
    el.style.width = `${pct}%`;
    el.dataset.start = block.startTime;
    el.dataset.duration = block.duration;
    el.dataset.id = block.id;
    
    el.innerHTML = `
      <div class="gantt-p-id">${block.id}</div>
      <div style="font-size: 9px; opacity: 0.7;">${block.duration}s</div>
    `;
    
    // Add jump execution timeline click
    el.addEventListener('click', () => {
      renderTimeStep(block.startTime);
    });

    ganttChart.appendChild(el);
  });

  // Render tick numbers underneath
  for (let i = 0; i <= totalDuration; i++) {
    const tick = document.createElement('div');
    tick.className = 'gantt-tick';
    const pct = (1 / totalDuration) * 100;
    tick.style.width = `${pct}%`;
    tick.innerText = `${i}`;
    ganttTicks.appendChild(tick);
  }
}

// --- UPDATE METRICS LABELS ---
function updateMetricsDisplay(metrics) {
  valAvgWt.innerText = `${metrics.avgWt.toFixed(2)}s`;
  valAvgTat.innerText = `${metrics.avgTat.toFixed(2)}s`;
  valAvgRt.innerText = `${metrics.avgRt.toFixed(2)}s`;
  valCpuUtil.innerText = `${metrics.cpuUtil}%`;
}

// --- SIDE-BY-SIDE COMPARISON BAR CHARTS ---
function renderComparisonCharts() {
  wtComparisonChart.innerHTML = '';
  tatComparisonChart.innerHTML = '';
  
  const algosToCompare = [
    { code: 'fcfs', name: 'FCFS' },
    { code: 'sjf-np', name: 'SJF (NP)' },
    { code: 'sjf-p', name: 'SRTF (P)' },
    { code: 'rr', name: 'RR' },
    { code: 'priority-np', name: 'Priority (NP)' },
    { code: 'priority-p', name: 'Priority (P)' }
  ];

  // Run all schedulers and gather averages
  const results = algosToCompare.map(a => {
    const res = runScheduler(processes, a.code, timeQuantum);
    return {
      name: a.name,
      avgWt: res.metrics.avgWt,
      avgTat: res.metrics.avgTat
    };
  });

  // Find max values for percentage calculations
  const maxWt = Math.max(...results.map(r => r.avgWt), 1);
  const maxTat = Math.max(...results.map(r => r.avgTat), 1);

  // Render Waiting Time Chart
  results.forEach(res => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    
    const fillPercent = (res.avgWt / maxWt) * 80 + 20; // scale between 20% and 100% for readability
    
    row.innerHTML = `
      <div class="bar-label">${res.name}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${res.avgWt === 0 ? 0 : fillPercent}%; background-color: var(--accent-primary);">
          ${res.avgWt.toFixed(1)}s
        </div>
      </div>
      <div class="bar-val">${res.avgWt.toFixed(1)}s</div>
    `;
    wtComparisonChart.appendChild(row);
  });

  // Render Turnaround Time Chart
  results.forEach(res => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    
    const fillPercent = (res.avgTat / maxTat) * 80 + 20;
    
    row.innerHTML = `
      <div class="bar-label">${res.name}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${res.avgTat === 0 ? 0 : fillPercent}%; background-color: #A67C52;">
          ${res.avgTat.toFixed(1)}s
        </div>
      </div>
      <div class="bar-val">${res.avgTat.toFixed(1)}s</div>
    `;
    tatComparisonChart.appendChild(row);
  });
}

// --- PLAYBACK ANIMATION TIMELINE LOOP ---
function togglePlay() {
  if (isPlaying) {
    pauseTimeline();
  } else {
    playTimeline();
  }
}

function playTimeline() {
  if (currentTime >= maxTime) {
    currentTime = 0; // Wrap around reset
  }
  
  isPlaying = true;
  playIcon.style.display = 'none';
  pauseIcon.style.display = 'inline';
  playText.innerText = 'Pause';
  
  playIntervalId = setInterval(() => {
    if (currentTime < maxTime) {
      currentTime++;
      renderTimeStep(currentTime);
    } else {
      pauseTimeline();
    }
  }, playbackSpeedMs);
}

function pauseTimeline() {
  isPlaying = false;
  playIcon.style.display = 'inline';
  pauseIcon.style.display = 'none';
  playText.innerText = 'Play';
  
  if (playIntervalId) {
    clearInterval(playIntervalId);
    playIntervalId = null;
  }
}

function stepForward() {
  pauseTimeline();
  if (currentTime < maxTime) {
    currentTime++;
    renderTimeStep(currentTime);
  }
}

function stepBackward() {
  pauseTimeline();
  if (currentTime > 0) {
    currentTime--;
    renderTimeStep(currentTime);
  }
}

function resetSimulation() {
  pauseTimeline();
  currentTime = 0;
  renderTimeStep(0);
}

function clearVisualization() {
  currentTime = 0;
  currentTimeDisplay.innerText = '0';
  readyItemsContainer.innerHTML = `<div style="font-size: 12px; color: var(--text-light); text-align: center; width: 100%; margin-top: 10px;">Queue Empty</div>`;
  readyCountBadge.innerText = '0';
  cpuSlot.innerText = 'IDLE';
  cpuSlot.className = 'cpu-core-slot';
  completedItemsContainer.innerHTML = '';
  completedCountBadge.innerText = '0';
  ganttChart.innerHTML = '';
  ganttTicks.innerHTML = '';
  valAvgWt.innerText = '0.00s';
  valAvgTat.innerText = '0.00s';
  valAvgRt.innerText = '0.00s';
  valCpuUtil.innerText = '100%';
  wtComparisonChart.innerHTML = '';
  tatComparisonChart.innerHTML = '';
}

// --- MANUAL SCHEDULER QUIZ LOGIC ---

function getDecisionPoints(timeline, processes, algo, quantum) {
  const points = new Set();
  points.add(0); // Time 0 is always a decision point

  const maxTime = timeline.length - 1;
  let activeStart = 0;
  let lastActiveId = null;

  for (let t = 1; t <= maxTime; t++) {
    const prevSnapshot = timeline[t - 1];
    const currSnapshot = timeline[t];

    const prevActive = prevSnapshot.activeId;
    const currActive = currSnapshot.activeId;

    // 1. Process completion: if prevActive was running but completes at t
    if (prevActive && prevSnapshot.remainingBursts[prevActive] === 1) {
      points.add(t);
    }

    // 2. New arrivals
    const hasNewArrival = processes.some(p => p.arrival === t);
    if (hasNewArrival) {
      if (algo === 'sjf-p' || algo === 'priority-p') {
        points.add(t);
      }
      if (algo === 'rr' && !prevActive) {
        points.add(t);
      }
    }

    // 3. RR quantum expiration
    if (algo === 'rr' && prevActive) {
      if (prevActive !== lastActiveId) {
        activeStart = t - 1;
        lastActiveId = prevActive;
      }
      const timeSpent = t - activeStart;
      if (timeSpent === quantum) {
        points.add(t);
      }
    }
  }

  // Remove maxTime since no decisions are made once everything is finished
  points.delete(maxTime);

  return Array.from(points).sort((a, b) => a - b);
}

function getSchedulingReason(t, correctId, snapshot, processes, algo, quantum, prevActiveId) {
  if (!correctId || correctId === 'IDLE') {
    const activeProcesses = processes.filter(p => p.arrival <= t && snapshot.remainingBursts[p.id] > 0);
    if (activeProcesses.length === 0) {
      return "No processes have arrived yet or all processes have completed execution, so the CPU must remain IDLE.";
    } else {
      return "No ready processes are available to run at this time, so the CPU is IDLE.";
    }
  }

  const p = processes.find(proc => proc.id === correctId);
  const currentBurst = snapshot.remainingBursts[correctId];
  const currentPri = snapshot.priorities[correctId];

  const algoNames = {
    'fcfs': 'First-Come First-Served (FCFS)',
    'sjf-np': 'Shortest Job First (SJF - Non-Preemptive)',
    'sjf-p': 'Shortest Remaining Time First (SRTF)',
    'rr': 'Round Robin (RR)',
    'priority-np': 'Priority (Non-Preemptive)',
    'priority-p': 'Priority (Preemptive)'
  };
  const algoName = algoNames[algo] || algo;

  const readyIds = snapshot.readyQueueIds.filter(id => id !== correctId);
  const readyPills = readyIds.map(id => {
    const rp = processes.find(proc => proc.id === id);
    const remB = snapshot.remainingBursts[id];
    const pri = snapshot.priorities[id];
    if (algo.startsWith('priority')) {
      return `${id} (Priority: ${pri})`;
    } else if (algo === 'sjf-p' || algo === 'sjf-np') {
      return `${id} (Burst: ${remB}s)`;
    } else {
      return id;
    }
  }).join(', ');

  const readyText = readyPills ? ` compared to other ready process(es): [${readyPills}]` : '';

  if (algo === 'fcfs') {
    if (prevActiveId && prevActiveId === correctId) {
      return `${algoName} is non-preemptive. The currently running process ${correctId} must continue running until completion.`;
    }
    return `${algoName} schedules the process that arrived first. ${correctId} arrived at Time = ${p.arrival}s${readyText}.`;
  }

  if (algo === 'sjf-np') {
    if (prevActiveId && prevActiveId === correctId) {
      return `${algoName} is non-preemptive. The currently running process ${correctId} must continue running until completion.`;
    }
    const tied = readyIds.find(id => {
      const rp = processes.find(proc => proc.id === id);
      return rp.burst === p.burst;
    });
    if (tied) {
      const rp = processes.find(proc => proc.id === tied);
      return `${algoName} selected ${correctId} because both ${correctId} and ${tied} have a burst time of ${p.burst}s, but ${correctId} arrived first (Time = ${p.arrival}s vs ${rp.arrival}s).`;
    }
    return `${algoName} selected ${correctId} because it has the shortest burst time (${p.burst}s)${readyText}.`;
  }

  if (algo === 'sjf-p') {
    if (prevActiveId && prevActiveId === correctId) {
      return `${correctId} continues running as it still has the shortest remaining burst time (${currentBurst}s)${readyText}.`;
    }
    if (prevActiveId && prevActiveId !== correctId) {
      const prevRem = snapshot.remainingBursts[prevActiveId] || 0;
      return `${correctId} preempts ${prevActiveId} because its remaining burst time (${currentBurst}s) is shorter than ${prevActiveId}'s remaining burst time (${prevRem}s).`;
    }
    return `${correctId} is scheduled because it has the shortest remaining burst time (${currentBurst}s) among all ready processes${readyText}.`;
  }

  if (algo === 'rr') {
    if (prevActiveId && prevActiveId === correctId) {
      return `${correctId} has not completed its Time Quantum of ${quantum}s and continues executing.`;
    }
    if (prevActiveId && prevActiveId !== correctId) {
      const prevRem = snapshot.remainingBursts[prevActiveId] || 0;
      if (prevRem === 0) {
        return `${prevActiveId} has completed. ${correctId} is selected from the front of the Ready Queue.`;
      } else {
        return `Time Quantum of ${quantum}s expired for ${prevActiveId}. It is placed at the back of the Ready Queue, and ${correctId} is selected from the front.`;
      }
    }
    return `${correctId} is selected from the front of the Ready Queue.`;
  }

  if (algo === 'priority-np') {
    if (prevActiveId && prevActiveId === correctId) {
      return `${algoName} is non-preemptive. The currently running process ${correctId} must continue running until completion.`;
    }
    let priText = `priority value of ${currentPri}`;
    if (currentPri < p.priority) {
      priText = `aged priority value of ${currentPri} (original: ${p.priority})`;
    }
    return `${algoName} selected ${correctId} because it has the highest priority (${priText}, where lower is higher priority)${readyText}.`;
  }

  if (algo === 'priority-p') {
    let priText = `priority ${currentPri}`;
    if (currentPri < p.priority) {
      priText = `aged priority ${currentPri} (original: ${p.priority})`;
    }
    if (prevActiveId && prevActiveId === correctId) {
      return `${correctId} continues executing as it still has the highest priority (${priText})${readyText}.`;
    }
    if (prevActiveId && prevActiveId !== correctId) {
      const prevPri = snapshot.priorities[prevActiveId];
      return `${correctId} (priority ${currentPri}) preempts ${prevActiveId} (priority ${prevPri}) because it has a higher priority (lower value).`;
    }
    return `${correctId} is scheduled because it has the highest priority (${priText})${readyText}.`;
  }

  return "";
}

function getPartialGanttBlocks(ganttBlocks, limitTime) {
  const partial = [];
  for (let block of ganttBlocks) {
    if (block.startTime >= limitTime) {
      break;
    }
    const duration = Math.min(block.duration, limitTime - block.startTime);
    partial.push({
      ...block,
      duration: duration
    });
  }
  return partial;
}

function renderGanttChartForQuiz(limitTime) {
  const result = runScheduler(processes, selectedAlgo, timeQuantum, agingEnabled, agingRate);
  const partialBlocks = getPartialGanttBlocks(result.ganttBlocks, limitTime);
  renderGanttChart(partialBlocks, limitTime);
}

function renderQuizTimeStep(t) {
  if (timeline.length === 0) return;
  
  currentTimeDisplay.innerText = t;
  currentTime = t;

  const state = timeline[t];
  
  let prevActiveId = null;
  if (t > 0) {
    const prevSnapshot = timeline[t - 1];
    if (prevSnapshot.activeId && state.remainingBursts[prevSnapshot.activeId] > 0) {
      prevActiveId = prevSnapshot.activeId;
    }
  }

  const activeProcesses = processes.filter(p => p.arrival <= t && state.remainingBursts[p.id] > 0);
  
  // Render Ready Queue
  readyItemsContainer.innerHTML = '';
  const readyCount = activeProcesses.filter(p => p.id !== prevActiveId).length;
  readyCountBadge.innerText = readyCount;
  
  if (readyCount === 0) {
    readyItemsContainer.innerHTML = `<div style="font-size: 12px; color: var(--text-light); text-align: center; width: 100%; margin-top: 10px;">Queue Empty</div>`;
  } else {
    activeProcesses.forEach(p => {
      if (p.id === prevActiveId) return;
      const item = document.createElement('div');
      item.className = `p-block ${p.colorClass}`;
      const rem = state.remainingBursts[p.id];
      
      let priorityIndicator = '';
      if (state.priorities && state.priorities[p.id] !== undefined) {
        const currentPriority = state.priorities[p.id];
        const originalPriority = p.priority;
        if (currentPriority < originalPriority) {
          priorityIndicator = ` <span class="aged-badge" title="Original: ${originalPriority}">Aged: ${currentPriority}</span>`;
        } else if (selectedAlgo.startsWith('priority')) {
          priorityIndicator = ` <span style="font-size: 10px; margin-left: 6px; opacity: 0.8;">Pri: ${currentPriority}</span>`;
        }
      }
      
      item.innerHTML = `${p.id} <span>Rem: ${rem}s</span>${priorityIndicator}`;
      readyItemsContainer.appendChild(item);
    });
  }

  // Render CPU
  if (prevActiveId) {
    const p = processes.find(proc => proc.id === prevActiveId);
    let priText = '';
    if (state.priorities && state.priorities[prevActiveId] !== undefined && selectedAlgo.startsWith('priority')) {
      const currentPriority = state.priorities[prevActiveId];
      priText = ` (${prevActiveId} [Pri: ${currentPriority}])`;
    } else {
      priText = ` (${prevActiveId})`;
    }
    cpuSlot.innerText = `Running${priText}`;
    cpuSlot.className = `cpu-core-slot active ${p.colorClass}`;
  } else {
    cpuSlot.innerText = 'IDLE';
    cpuSlot.className = 'cpu-core-slot';
  }

  // Render Completed
  completedItemsContainer.innerHTML = '';
  const completedIds = processes
    .filter(p => state.remainingBursts[p.id] === 0)
    .map(p => p.id);
  completedCountBadge.innerText = completedIds.length;
  
  completedIds.forEach(id => {
    const p = processes.find(proc => proc.id === id);
    if (p) {
      const item = document.createElement('div');
      item.className = `p-block ${p.colorClass}`;
      item.style.opacity = '0.6';
      item.innerHTML = `${p.id} <span>Done</span>`;
      completedItemsContainer.appendChild(item);
    }
  });

  renderGanttChartForQuiz(t);
}

function showQuizQuestion(t) {
  quizPromptText.innerHTML = `At <strong>Time = ${t}s</strong>, select the next process to run:`;
  quizOptions.innerHTML = '';
  quizFeedback.style.display = 'none';
  quizFeedbackActive = false;

  const state = timeline[t];
  const activeProcesses = processes.filter(p => p.arrival <= t && state.remainingBursts[p.id] > 0);
  
  activeProcesses.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'quiz-btn';
    btn.innerText = p.id;
    btn.dataset.id = p.id;
    btn.addEventListener('click', () => handleQuizAnswer(p.id));
    quizOptions.appendChild(btn);
  });

  const idleBtn = document.createElement('button');
  idleBtn.className = 'quiz-btn';
  idleBtn.innerText = 'IDLE';
  idleBtn.dataset.id = 'IDLE';
  idleBtn.addEventListener('click', () => handleQuizAnswer('IDLE'));
  quizOptions.appendChild(idleBtn);
}

function handleQuizAnswer(selectedId) {
  if (quizFeedbackActive) return;
  quizFeedbackActive = true;

  const t = quizDecisionPoints[quizIndex];
  const correctActiveId = timeline[t].activeId;
  const correctId = correctActiveId ? correctActiveId : 'IDLE';

  let prevActiveId = null;
  if (t > 0) {
    const prevSnapshot = timeline[t - 1];
    if (prevSnapshot.activeId && timeline[t].remainingBursts[prevSnapshot.activeId] > 0) {
      prevActiveId = prevSnapshot.activeId;
    }
  }

  const reason = getSchedulingReason(t, correctActiveId, timeline[t], processes, selectedAlgo, timeQuantum, prevActiveId);

  quizTotalQuestions++;
  quizScoreTotal.innerText = quizTotalQuestions;

  const buttons = quizOptions.querySelectorAll('.quiz-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.id === correctId) {
      btn.classList.add('btn-correct');
    }
  });

  const nextBtnContainer = document.createElement('div');
  nextBtnContainer.id = 'quiz-next-container';
  nextBtnContainer.style.display = 'flex';
  nextBtnContainer.style.justifyContent = 'flex-end';
  nextBtnContainer.style.marginTop = '12px';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-primary';
  nextBtn.style.padding = '6px 14px';
  nextBtn.style.fontSize = '12px';
  nextBtn.innerText = quizIndex < quizDecisionPoints.length - 1 ? 'Next Step →' : 'Finish Quiz 🏁';
  nextBtn.addEventListener('click', advanceQuiz);
  nextBtnContainer.appendChild(nextBtn);

  if (selectedId === correctId) {
    quizCorrectCount++;
    quizScoreCorrect.innerText = quizCorrectCount;
    
    quizFeedback.className = 'quiz-feedback success';
    quizFeedback.innerHTML = `<strong>Correct!</strong> ${reason}`;
  } else {
    buttons.forEach(btn => {
      if (btn.dataset.id === selectedId) {
        btn.classList.add('btn-incorrect');
      }
    });

    quizFeedback.className = 'quiz-feedback error';
    quizFeedback.innerHTML = `<strong>Incorrect.</strong> ${reason}`;
  }

  quizFeedback.style.display = 'block';
  quizFeedback.appendChild(nextBtnContainer);
}

function advanceQuiz() {
  const container = document.getElementById('quiz-next-container');
  if (container) container.remove();

  if (quizIndex < quizDecisionPoints.length - 1) {
    quizIndex++;
    const nextTime = quizDecisionPoints[quizIndex];
    renderQuizTimeStep(nextTime);
    showQuizQuestion(nextTime);
  } else {
    endQuiz();
  }
}

function initQuiz() {
  quizMode = true;
  quizCorrectCount = 0;
  quizTotalQuestions = 0;
  quizFeedbackActive = false;
  quizScoreCorrect.innerText = '0';
  quizScoreTotal.innerText = '0';

  document.querySelector('.player-controls').style.display = 'none';
  document.querySelector('.speed-control').style.display = 'none';
  quizPanel.style.display = 'flex';

  triggerCalculation();
}

function endQuiz() {
  quizFeedback.className = 'quiz-feedback success';
  quizFeedback.innerHTML = `<h3>Quiz Completed! 🎓</h3>
  <p style="margin-top: 6px; font-size: 14px;">You scored <strong>${quizCorrectCount} / ${quizTotalQuestions}</strong>.</p>
  <p style="margin-top: 6px; font-size: 13px;">Standard simulator controls have been restored. You can play, pause, or step through the Gantt chart to review your results.</p>`;
  
  // Clean up option buttons
  quizOptions.innerHTML = '';
  quizPromptText.innerText = 'Completed!';

  // Show normal simulation controls
  document.querySelector('.player-controls').style.display = 'flex';
  document.querySelector('.speed-control').style.display = 'flex';

  // Render the final full timeline state
  const result = runScheduler(processes, selectedAlgo, timeQuantum, agingEnabled, agingRate);
  renderGanttChart(result.ganttBlocks, maxTime);
  renderTimeStep(maxTime);
}

function exitQuiz() {
  quizMode = false;
  quizPanel.style.display = 'none';
  
  document.querySelector('.player-controls').style.display = 'flex';
  document.querySelector('.speed-control').style.display = 'flex';
  
  triggerCalculation();
}
