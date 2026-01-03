// ==================== Global Variables ====================
let tasks = [];
let notes = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = new Date();
let timerInterval = null;
let timerSeconds = 0;
let timerMode = 'focus'; // focus, shortBreak, longBreak
let isPaused = false;
let pomodorosCompleted = 0;
let totalFocusTime = 0;

// ==================== Initialize App ====================
window.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initializeApp();
    updateAllStats();
    renderCalendar();
    displayCurrentDate();
    checkNotifications();
});

function initializeApp() {
    setupNavigation();
    setupModals();
    setupEventListeners();
    renderTasks();
    renderNotes();
    renderTodayTasks();
    renderActivityFeed();
    updateAnalytics();
}

// ==================== Navigation ====================
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page-content');
    const pageTitle = document.getElementById('page-title');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.dataset.page;
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(`${targetPage}-page`).classList.add('active');
            
            pageTitle.textContent = item.querySelector('span').textContent;
            
            if (window.innerWidth <= 968) {
                sidebar.classList.remove('active');
            }
        });
    });

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// ==================== Date Display ====================
function displayCurrentDate() {
    const dateElement = document.getElementById('current-date');
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    dateElement.textContent = new Date().toLocaleDateString('en-US', options);
}

// ==================== Task Management ====================
function setupEventListeners() {
    // Task Modal
    const addTaskModalBtn = document.getElementById('add-task-modal-btn');
    const taskModal = document.getElementById('task-modal');
    const saveTaskBtn = document.getElementById('save-task-btn');
    const taskSearch = document.getElementById('task-search');
    const filterPriority = document.getElementById('filter-priority');
    const filterStatus = document.getElementById('filter-status');

    addTaskModalBtn.addEventListener('click', () => openModal('task-modal'));
    saveTaskBtn.addEventListener('click', saveTask);
    taskSearch.addEventListener('input', renderTasks);
    filterPriority.addEventListener('change', renderTasks);
    filterStatus.addEventListener('change', renderTasks);

    // Note Modal
    const addNoteBtn = document.getElementById('add-note-btn');
    const saveNoteBtn = document.getElementById('save-note-btn');

    addNoteBtn.addEventListener('click', () => openModal('note-modal'));
    saveNoteBtn.addEventListener('click', saveNote);

    // Calendar Navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    // Pomodoro Timer
    document.getElementById('start-timer').addEventListener('click', startTimer);
    document.getElementById('pause-timer').addEventListener('click', pauseTimer);
    document.getElementById('reset-timer').addEventListener('click', resetTimer);
}

function saveTask() {
    const title = document.getElementById('task-title').value.trim();
    const subject = document.getElementById('task-subject').value;
    const priority = document.getElementById('task-priority').value;
    const deadline = document.getElementById('task-deadline').value;
    const time = document.getElementById('task-time').value;
    const description = document.getElementById('task-description').value.trim();

    if (!title || !subject || !deadline) {
        alert('Please fill in all required fields!');
        return;
    }

    const task = {
        id: Date.now(),
        title,
        subject,
        priority,
        deadline,
        estimatedTime: time || 'N/A',
        description,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(task);
    saveToLocalStorage();
    renderTasks();
    renderTodayTasks();
    renderCalendar();
    updateAllStats();
    addActivity(`Created task: ${title}`, 'create');
    closeModal('task-modal');
    clearTaskForm();
}

function clearTaskForm() {
    document.getElementById('task-title').value = '';
    document.getElementById('task-subject').value = '';
    document.getElementById('task-priority').value = 'High';
    document.getElementById('task-deadline').value = '';
    document.getElementById('task-time').value = '';
    document.getElementById('task-description').value = '';
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    const searchQuery = document.getElementById('task-search').value.toLowerCase();
    const priorityFilter = document.getElementById('filter-priority').value;
    const statusFilter = document.getElementById('filter-status').value;

    let filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery) || 
                            task.subject.toLowerCase().includes(searchQuery);
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        const matchesStatus = statusFilter === 'all' || 
                             (statusFilter === 'completed' && task.completed) ||
                             (statusFilter === 'pending' && !task.completed);
        
        return matchesSearch && matchesPriority && matchesStatus;
    });

    if (filteredTasks.length === 0) {
        container.innerHTML = '<p class="empty-message">No tasks found</p>';
        return;
    }

    container.innerHTML = filteredTasks.map(task => `
        <div class="task-card ${task.completed ? 'completed' : ''}">
            <div class="task-card-header">
                <div class="task-title-section">
                    <h3>${task.title}</h3>
                    <div class="task-meta">
                        <span class="task-meta-item">
                            <i class="fas fa-book"></i> ${task.subject}
                        </span>
                        <span class="task-meta-item">
                            <i class="fas fa-calendar"></i> ${formatDate(task.deadline)}
                        </span>
                        <span class="task-meta-item">
                            <i class="fas fa-clock"></i> ${task.estimatedTime}${task.estimatedTime !== 'N/A' ? 'h' : ''}
                        </span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px; align-items: flex-end;">
                    <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    <div class="task-actions-btns">
                        <button class="btn-icon btn-complete-task" onclick="toggleTaskComplete(${task.id})">
                            <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                        </button>
                        <button class="btn-icon btn-delete-task" onclick="deleteTask(${task.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            ${task.description ? `<p style="margin-top: 10px; color: var(--text-secondary);">${task.description}</p>` : ''}
        </div>
    `).join('');
}

function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveToLocalStorage();
        renderTasks();
        renderTodayTasks();
        updateAllStats();
        addActivity(task.completed ? `Completed: ${task.title}` : `Reopened: ${task.title}`, 
                   task.completed ? 'complete' : 'reopen');
    }
}

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        const task = tasks.find(t => t.id === id);
        tasks = tasks.filter(t => t.id !== id);
        saveToLocalStorage();
        renderTasks();
        renderTodayTasks();
        renderCalendar();
        updateAllStats();
        if (task) addActivity(`Deleted: ${task.title}`, 'delete');
    }
}

// ==================== Today's Tasks ====================
function renderTodayTasks() {
    const container = document.getElementById('today-tasks-list');
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.deadline === today && !task.completed);

    if (todayTasks.length === 0) {
        container.innerHTML = '<p class="empty-message">No tasks for today</p>';
        return;
    }

    container.innerHTML = todayTasks.map(task => `
        <div class="today-task-item">
            <input type="checkbox" onchange="toggleTaskComplete(${task.id})">
            <div class="today-task-content">
                <h4>${task.title}</h4>
                <p>${task.subject} • ${task.priority} Priority</p>
            </div>
        </div>
    `).join('');
}

// ==================== Calendar ====================
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('calendar-month-year');
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    let html = '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="calendar-day other-month">${day}</div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasTasks = tasks.some(task => task.deadline === dateStr);
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        const isSelected = dateStr === selectedDate.toISOString().split('T')[0];
        
        html += `<div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasTasks ? 'has-tasks' : ''}" 
                     onclick="selectCalendarDate('${dateStr}')">${day}</div>`;
    }

    // Next month days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day other-month">${day}</div>`;
    }

    grid.innerHTML = html;
    renderCalendarTasks();
}

function selectCalendarDate(dateStr) {
    selectedDate = new Date(dateStr + 'T00:00:00');
    renderCalendar();
}

function renderCalendarTasks() {
    const container = document.getElementById('date-tasks-list');
    const dateDisplay = document.getElementById('selected-date');
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    dateDisplay.textContent = formatDate(dateStr);
    
    const dateTasks = tasks.filter(task => task.deadline === dateStr);
    
    if (dateTasks.length === 0) {
        container.innerHTML = '<p class="empty-message">No tasks for this date</p>';
        return;
    }

    container.innerHTML = dateTasks.map(task => `
        <div class="today-task-item">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskComplete(${task.id})">
            <div class="today-task-content">
                <h4 style="${task.completed ? 'text-decoration: line-through;' : ''}">${task.title}</h4>
                <p>${task.subject} • ${task.priority} Priority</p>
            </div>
        </div>
    `).join('');
}

// ==================== Pomodoro Timer ====================
function startTimer() {
    const focusTime = parseInt(document.getElementById('focus-time').value) * 60;
    const shortBreak = parseInt(document.getElementById('short-break').value) * 60;
    const longBreak = parseInt(document.getElementById('long-break').value) * 60;

    if (timerSeconds === 0) {
        if (timerMode === 'focus') {
            timerSeconds = focusTime;
        } else if (timerMode === 'shortBreak') {
            timerSeconds = shortBreak;
        } else {
            timerSeconds = longBreak;
        }
    }

    document.getElementById('start-timer').style.display = 'none';
    document.getElementById('pause-timer').style.display = 'inline-flex';

    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            timerComplete();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    document.getElementById('start-timer').style.display = 'inline-flex';
    document.getElementById('pause-timer').style.display = 'none';
}

function resetTimer() {
    clearInterval(timerInterval);
    timerSeconds = 0;
    timerMode = 'focus';
    document.getElementById('start-timer').style.display = 'inline-flex';
    document.getElementById('pause-timer').style.display = 'none';
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timer-display').textContent = display;

    const focusTime = parseInt(document.getElementById('focus-time').value) * 60;
    const totalSeconds = timerMode === 'focus' ? focusTime : parseInt(document.getElementById('short-break').value) * 60;
    const progress = ((totalSeconds - timerSeconds) / totalSeconds) * 880;
    document.getElementById('timer-circle').style.strokeDashoffset = progress;
}

function timerComplete() {
    if (timerMode === 'focus') {
        pomodorosCompleted++;
        totalFocusTime += parseInt(document.getElementById('focus-time').value);
        updatePomodoroStats();
        addActivity('Completed a Pomodoro session', 'pomodoro');
        alert('Focus session complete! Time for a break.');
        timerMode = 'shortBreak';
    } else {
        alert('Break complete! Ready for another session?');
        timerMode = 'focus';
    }
    resetTimer();
}

function updatePomodoroStats() {
    document.getElementById('pomodoros-completed').textContent = pomodorosCompleted;
    const hours = Math.floor(totalFocusTime / 60);
    const minutes = totalFocusTime % 60;
    document.getElementById('total-focus-time').textContent = `${hours}h ${minutes}m`;
    saveToLocalStorage();
}

// ==================== Statistics ====================
function updateAllStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('total-tasks-stat').textContent = total;
    document.getElementById('completed-tasks-stat').textContent = completed;
    document.getElementById('pending-tasks-stat').textContent = pending;
    
    // Update weekly progress
    const weeklyPercentage = completionRate;
    document.getElementById('weekly-percentage').textContent = `${weeklyPercentage}%`;
    
    const circle = document.getElementById('weekly-progress-circle');
    const offset = 502 - (502 * weeklyPercentage / 100);
    circle.style.strokeDashoffset = offset;

    updateStreak();
    checkNotifications();
}

function updateStreak() {
    // Simple streak calculation based on consecutive days with completed tasks
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const hasCompletedTask = tasks.some(task => 
            task.deadline === dateStr && task.completed
        );
        
        if (hasCompletedTask) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    
    document.getElementById('study-streak').textContent = streak;
}

function checkNotifications() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const urgentTasks = tasks.filter(task => 
        !task.completed && (task.deadline === today || task.deadline === tomorrowStr)
    );
    
    document.getElementById('notification-count').textContent = urgentTasks.length;
}

// ==================== Activity Feed ====================
let activityFeed = [];

function addActivity(message, type) {
    activityFeed.unshift({
        message,
        type,
        timestamp: new Date().toISOString()
    });
    
    if (activityFeed.length > 10) {
        activityFeed = activityFeed.slice(0, 10);
    }
    
    renderActivityFeed();
    saveToLocalStorage();
}

function renderActivityFeed() {
    const container = document.getElementById('activity-feed');
    
    if (activityFeed.length === 0) {
        container.innerHTML = '<p class="empty-message">No recent activity</p>';
        return;
    }

    container.innerHTML = activityFeed.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <h4>${activity.message}</h4>
                <p>${getTimeAgo(activity.timestamp)}</p>
            </div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    const icons = {
        create: 'plus',
        complete: 'check',
        delete: 'trash',
        reopen: 'undo',
        pomodoro: 'clock'
    };
    return icons[type] || 'circle';
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// ==================== Analytics ====================
function updateAnalytics() {
    updateSubjectDistribution();
    updateWeeklyPerformance();
}

function updateSubjectDistribution() {
    const container = document.getElementById('subject-distribution');
    const subjectCounts = {};
    
    tasks.forEach(task => {
        subjectCounts[task.subject] = (subjectCounts[task.subject] || 0) + 1;
    });

    const total = tasks.length;
    
    if (total === 0) {
        container.innerHTML = '<p class="empty-message">No data available</p>';
        return;
    }

    container.innerHTML = Object.entries(subjectCounts).map(([subject, count]) => {
        const percentage = Math.round((count / total) * 100);
        return `
            <div class="bar-item">
                <div class="bar-label">${subject}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%">${count}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateWeeklyPerformance() {
    const container = document.getElementById('weekly-performance');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekData = {};

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i));
        const dateStr = date.toISOString().split('T')[0];
        const dayName = days[date.getDay()];
        
        const dayTasks = tasks.filter(task => task.deadline === dateStr);
        const completed = dayTasks.filter(task => task.completed).length;
        
        weekData[dayName] = { total: dayTasks.length, completed };
    }

    const maxTasks = Math.max(...Object.values(weekData).map(d => d.total), 1);

    container.innerHTML = days.map(day => {
        const data = weekData[day];
        const percentage = (data.total / maxTasks) * 100;
        return `
            <div class="bar-item">
                <div class="bar-label">${day}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%">${data.completed}/${data.total}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== Notes Management ====================
function saveNote() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    const subject = document.getElementById('note-subject').value;

    if (!title || !content) {
        alert('Please fill in all fields!');
        return;
    }

    const note = {
        id: Date.now(),
        title,
        content,
        subject,
        createdAt: new Date().toISOString()
    };

    notes.push(note);
    saveToLocalStorage();
    renderNotes();
    closeModal('note-modal');
    clearNoteForm();
}

function clearNoteForm() {
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
    document.getElementById('note-subject').value = 'General';
}

function renderNotes() {
    const container = document.getElementById('notes-grid');
    
    if (notes.length === 0) {
        container.innerHTML = '<p class="empty-message">No notes yet. Create your first note!</p>';
        return;
    }

    container.innerHTML = notes.map(note => `
        <div class="note-card">
            <h3>${note.title}</h3>
            <p>${note.content}</p>
            <div class="note-footer">
                <span class="note-tag">${note.subject}</span>
                <i class="fas fa-trash note-delete" onclick="deleteNote(${note.id})"></i>
            </div>
        </div>
    `).join('');
}

function deleteNote(id) {
    if (confirm('Delete this note?')) {
        notes = notes.filter(n => n.id !== id);
        saveToLocalStorage();
        renderNotes();
    }
}

// ==================== Modal Management ====================
function setupModals() {
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ==================== Local Storage ====================
function saveToLocalStorage() {
    localStorage.setItem('studyPlannerTasks', JSON.stringify(tasks));
    localStorage.setItem('studyPlannerNotes', JSON.stringify(notes));
    localStorage.setItem('activityFeed', JSON.stringify(activityFeed));
    localStorage.setItem('pomodoroData', JSON.stringify({
        completed: pomodorosCompleted,
        totalTime: totalFocusTime
    }));
}

function loadFromLocalStorage() {
    const storedTasks = localStorage.getItem('studyPlannerTasks');
    const storedNotes = localStorage.getItem('studyPlannerNotes');
    const storedActivity = localStorage.getItem('activityFeed');
    const storedPomodoro = localStorage.getItem('pomodoroData');

    if (storedTasks) tasks = JSON.parse(storedTasks);
    if (storedNotes) notes = JSON.parse(storedNotes);
    if (storedActivity) activityFeed = JSON.parse(storedActivity);
    if (storedPomodoro) {
        const data = JSON.parse(storedPomodoro);
        pomodorosCompleted = data.completed || 0;
        totalFocusTime = data.totalTime || 0;
        updatePomodoroStats();
    }
}

// ==================== Utility Functions ====================
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}
