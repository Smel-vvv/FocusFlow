document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timeDisplay = document.querySelector('.time');
    const progressBar = document.querySelector('.progress-bar');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const modeTabs = document.querySelectorAll('.mode-tab');
    const alarm = document.getElementById('alarm');
    const tickSound = document.getElementById('tick-sound');
    const sessionCount = document.getElementById('session-count');
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const themeToggle = document.getElementById('theme-toggle');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettings = document.getElementById('close-settings');
    const viewStatsBtn = document.getElementById('view-stats');
    const statsModal = document.getElementById('stats-modal');
    const closeStats = document.getElementById('close-stats');
    const exportStatsBtn = document.getElementById('export-stats');
    const todaySessions = document.getElementById('today-sessions');
    const weekSessions = document.getElementById('week-sessions');
    const totalSessions = document.getElementById('total-sessions');
    const focusTime = document.getElementById('focus-time');
    const productivityChart = document.getElementById('productivity-chart');
    const languageSelect = document.getElementById('language-select');
    
    // Timer settings with defaults
    let settings = {
        pomodoro: 25 * 60,
        shortBreak: 5 * 60,
        longBreak: 15 * 60,
        autoStart: true,
        notifications: true,
        inactivityPause: true,
        theme: 'light',
        language: 'ru',
        longBreakInterval: 4,
        tickSound: true,
        volume: 0.5
    };
    
    // Timer state
    let timer = {
        interval: null,
        remainingTime: settings.pomodoro,
        isRunning: false,
        currentMode: 'pomodoro',
        sessionsCompleted: 0,
        lastActivity: Date.now(),
        inactivityTimeout: null
    };
    
    // Statistics
    let stats = {
        totalSessions: 0,
        todaySessions: 0,
        weekSessions: 0,
        focusTime: 0, // in seconds
        dailyStats: {},
        weeklyStats: {}
    };
    
    // Tasks
    let tasks = [];
    
    // Initialize the app
    function init() {
        loadSettings();
        loadStats();
        loadTasks();
        updateDisplay();
        setupEventListeners();
        setupInactivityMonitor();
        checkPWAInstallPrompt();
        updateLocalizedText();
    }
    
    // Load settings from localStorage
    function loadSettings() {
        const savedSettings = localStorage.getItem('pomodoroSettings');
        if (savedSettings) {
            settings = {...settings, ...JSON.parse(savedSettings)};
        }
        
        // Apply settings to UI
        document.getElementById('pomodoro-time').value = settings.pomodoro / 60;
        document.getElementById('short-break-time').value = settings.shortBreak / 60;
        document.getElementById('long-break-time').value = settings.longBreak / 60;
        document.getElementById('auto-start').checked = settings.autoStart;
        document.getElementById('notifications').checked = settings.notifications;
        document.getElementById('inactivity-pause').checked = settings.inactivityPause;
        document.getElementById('language-select').value = settings.language;
        
        // Apply theme
        document.body.setAttribute('data-theme', settings.theme);
        themeToggle.innerHTML = settings.theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        // Set volume
        alarm.volume = settings.volume;
        tickSound.volume = settings.volume;
    }
    
    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    }
    
    // Load statistics from localStorage
    function loadStats() {
        const savedStats = localStorage.getItem('pomodoroStats');
        if (savedStats) {
            stats = JSON.parse(savedStats);
        }
        
        // Initialize current date if not exists
        const today = new Date().toDateString();
        if (!stats.dailyStats[today]) {
            stats.dailyStats[today] = 0;
        }
        
        updateStatsDisplay();
    }
    
    // Save statistics to localStorage
    function saveStats() {
        localStorage.setItem('pomodoroStats', JSON.stringify(stats));
    }
    
    // Load tasks from localStorage
    function loadTasks() {
        const savedTasks = localStorage.getItem('pomodoroTasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
            renderTasks();
        }
    }
    
    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    }
    
    // Update statistics display
    function updateStatsDisplay() {
        todaySessions.textContent = stats.todaySessions;
        weekSessions.textContent = stats.weekSessions;
        totalSessions.textContent = stats.totalSessions;
        
        const hours = Math.floor(stats.focusTime / 3600);
        const minutes = Math.floor((stats.focusTime % 3600) / 60);
        focusTime.textContent = `${hours}ч ${minutes}м`;
        
        renderChart();
    }
    
    // Render productivity chart
    function renderChart() {
        const ctx = productivityChart.getContext('2d');
        
        // Prepare data for last 7 days
        const dates = [];
        const sessionData = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            dates.push(date.toLocaleDateString(settings.language, { weekday: 'short' }));
            sessionData.push(stats.dailyStats[dateStr] || 0);
        }
        
        // Destroy previous chart if exists
        if (productivityChart.chart) {
            productivityChart.chart.destroy();
        }
        
        // Create new chart
        productivityChart.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Сессии',
                    data: sessionData,
                    backgroundColor: 'rgba(94, 114, 228, 0.7)',
                    borderColor: 'rgba(94, 114, 228, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Export statistics
    function exportStats() {
        const dataStr = JSON.stringify(stats, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportName = `pomodoro_stats_${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Timer controls
        startBtn.addEventListener('click', startTimer);
        pauseBtn.addEventListener('click', pauseTimer);
        resetBtn.addEventListener('click', resetTimer);
        
        // Mode tabs
        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                switchMode(tab.dataset.mode);
                modeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
        
        // Settings
        settingsToggle.addEventListener('click', toggleSettingsPanel);
        closeSettings.addEventListener('click', toggleSettingsPanel);
        
        // Settings inputs
        document.getElementById('pomodoro-time').addEventListener('change', (e) => {
            settings.pomodoro = parseInt(e.target.value) * 60;
            if (timer.currentMode === 'pomodoro' && !timer.isRunning) {
                timer.remainingTime = settings.pomodoro;
                updateDisplay();
            }
            saveSettings();
        });
        
        document.getElementById('short-break-time').addEventListener('change', (e) => {
            settings.shortBreak = parseInt(e.target.value) * 60;
            if (timer.currentMode === 'short-break' && !timer.isRunning) {
                timer.remainingTime = settings.shortBreak;
                updateDisplay();
            }
            saveSettings();
        });
        
        document.getElementById('long-break-time').addEventListener('change', (e) => {
            settings.longBreak = parseInt(e.target.value) * 60;
            if (timer.currentMode === 'long-break' && !timer.isRunning) {
                timer.remainingTime = settings.longBreak;
                updateDisplay();
            }
            saveSettings();
        });
        
        document.getElementById('auto-start').addEventListener('change', (e) => {
            settings.autoStart = e.target.checked;
            saveSettings();
        });
        
        document.getElementById('notifications').addEventListener('change', (e) => {
            settings.notifications = e.target.checked;
            saveSettings();
        });
        
        document.getElementById('inactivity-pause').addEventListener('change', (e) => {
            settings.inactivityPause = e.target.checked;
            saveSettings();
        });
        
        // Theme toggle
        themeToggle.addEventListener('click', toggleTheme);
        
        // Fullscreen toggle
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        
        // Stats modal
        viewStatsBtn.addEventListener('click', () => {
            statsModal.classList.add('active');
        });
        
        closeStats.addEventListener('click', () => {
            statsModal.classList.remove('active');
        });
        
        statsModal.addEventListener('click', (e) => {
            if (e.target === statsModal) {
                statsModal.classList.remove('active');
            }
        });
        
        // Export stats
        exportStatsBtn.addEventListener('click', exportStats);
        
        // Language select
        languageSelect.addEventListener('change', (e) => {
            settings.language = e.target.value;
            saveSettings();
            updateLocalizedText();
        });
        
        // Task management
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTask();
            }
        });
        
        // Track activity for inactivity pause
        document.addEventListener('mousemove', recordActivity);
        document.addEventListener('keydown', recordActivity);
        document.addEventListener('click', recordActivity);
    }
    
    // Update localized text based on selected language
    function updateLocalizedText() {
        // This would be expanded with actual translations in a real app
        console.log('Language changed to', settings.language);
    }
    
    // Record user activity for inactivity monitoring
    function recordActivity() {
        timer.lastActivity = Date.now();
        
        if (timer.isRunning && settings.inactivityPause) {
            clearTimeout(timer.inactivityTimeout);
            timer.inactivityTimeout = setTimeout(checkInactivity, 10000); // 10 seconds
        }
    }
    
    // Setup inactivity monitor
    function setupInactivityMonitor() {
        if (settings.inactivityPause) {
            timer.inactivityTimeout = setTimeout(checkInactivity, 10000); // 10 seconds
        }
    }
    
    // Check for inactivity
    function checkInactivity() {
        const inactiveTime = (Date.now() - timer.lastActivity) / 1000; // in seconds
        if (inactiveTime > 30 && timer.isRunning) { // 30 seconds inactive
            pauseTimer();
            if (settings.notifications) {
                showNotification('Таймер приостановлен', 'Таймер был приостановлен из-за неактивности.');
            }
        }
    }
    
    // Toggle theme between light and dark
    function toggleTheme() {
        settings.theme = settings.theme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', settings.theme);
        themeToggle.innerHTML = settings.theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        saveSettings();
    }
    
    // Toggle fullscreen mode
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        }
    }
    
    // Toggle settings panel
    function toggleSettingsPanel() {
        settingsPanel.classList.toggle('active');
    }
    
    // Show notification
    function showNotification(title, message) {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }
        
        if (Notification.permission === 'granted') {
            new Notification(title, { body: message });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body: message });
                }
            });
        }
    }
    
    // Start timer
    function startTimer() {
        if (timer.isRunning) return;
        
        timer.isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        // Update last activity time
        timer.lastActivity = Date.now();
        
        // Setup inactivity monitor if enabled
        if (settings.inactivityPause) {
            clearTimeout(timer.inactivityTimeout);
            timer.inactivityTimeout = setTimeout(checkInactivity, 10000); // 10 seconds
        }
        
        timer.interval = setInterval(() => {
            timer.remainingTime--;
            updateDisplay();
            
            // Play tick sound if enabled
            if (settings.tickSound && timer.remainingTime % 60 === 0 && timer.remainingTime > 0) {
                tickSound.currentTime = 0;
                tickSound.play();
            }
            
            if (timer.remainingTime <= 0) {
                clearInterval(timer.interval);
                timer.isRunning = false;
                alarm.currentTime = 0;
                alarm.play();
                
                // Update statistics
                updateStatsAfterCompletion();
                
                if (timer.currentMode === 'pomodoro') {
                    // After work session
                    timer.sessionsCompleted++;
                    sessionCount.textContent = timer.sessionsCompleted;
                    
                    // Determine next mode (long break after every 4 sessions)
                    const nextMode = timer.sessionsCompleted % settings.longBreakInterval === 0 ? 
                                      'long-break' : 'short-break';
                    
                    if (settings.autoStart) {
                        setTimeout(() => switchMode(nextMode), 1000);
                    } else {
                        switchMode(nextMode, false);
                        
                        if (settings.notifications) {
                            showNotification(
                                'Сессия завершена', 
                                `Время для ${nextMode === 'long-break' ? 'длинного перерыва' : 'короткого перерыва'}!`
                            );
                        }
                    }
                } else {
                    // After break
                    if (settings.autoStart) {
                        setTimeout(() => switchMode('pomodoro'), 1000);
                    } else {
                        switchMode('pomodoro', false);
                        
                        if (settings.notifications) {
                            showNotification('Перерыв окончен', 'Время вернуться к работе!');
                        }
                    }
                }
            }
        }, 1000);
    }
    
    // Update statistics after timer completion
    function updateStatsAfterCompletion() {
        const sessionDuration = settings[timer.currentMode];
        stats.totalSessions++;
        stats.focusTime += sessionDuration;
        
        // Update today's stats
        const today = new Date().toDateString();
        stats.dailyStats[today] = (stats.dailyStats[today] || 0) + 1;
        
        // Update this week's stats
        stats.weekSessions = Object.values(stats.dailyStats)
            .slice(0, 7)
            .reduce((sum, count) => sum + count, 0);
        
        // Update today's session count
        stats.todaySessions = stats.dailyStats[today] || 0;
        
        saveStats();
        updateStatsDisplay();
    }
    
    // Pause timer
    function pauseTimer() {
        if (!timer.isRunning) return;
        
        clearInterval(timer.interval);
        timer.isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        
        // Clear inactivity timeout
        clearTimeout(timer.inactivityTimeout);
    }
    
    // Reset timer
    function resetTimer() {
        clearInterval(timer.interval);
        timer.isRunning = false;
        timer.remainingTime = settings[timer.currentMode];
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        updateDisplay();
        
        // Clear inactivity timeout
        clearTimeout(timer.inactivityTimeout);
    }
    
    // Switch timer mode
    function switchMode(mode, reset = true) {
        timer.currentMode = mode;
        
        // Update active tab
        modeTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.mode === mode) {
                tab.classList.add('active');
            }
        });
        
        // Update progress bar color
        switch(mode) {
            case 'pomodoro':
                progressBar.style.backgroundColor = 'var(--primary-color)';
                break;
            case 'short-break':
                progressBar.style.backgroundColor = 'var(--secondary-color)';
                break;
            case 'long-break':
                progressBar.style.backgroundColor = 'var(--tertiary-color)';
                break;
        }
        
        if (reset) {
            resetTimer();
        }
    }
    
    // Update timer display
    function updateDisplay() {
        const minutes = Math.floor(timer.remainingTime / 60);
        const seconds = timer.remainingTime % 60;
        
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update progress bar
        const totalTime = settings[timer.currentMode];
        const percentage = (timer.remainingTime / totalTime) * 100;
        progressBar.style.width = `${percentage}%`;
    }
    
    // Add new task
    function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText === '') return;
        
        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        
        taskInput.value = '';
        taskInput.focus();
    }
    
    // Render tasks list
    function renderTasks() {
        taskList.innerHTML = '';
        
        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = `task-item ${task.completed ? 'task-completed' : ''}`;
            taskItem.dataset.id = task.id;
            
            taskItem.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <div class="task-actions">
                    <button class="task-btn delete" aria-label="Удалить задачу">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            const checkbox = taskItem.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => toggleTaskComplete(task.id));
            
            const deleteBtn = taskItem.querySelector('.delete');
            deleteBtn.addEventListener('click', () => deleteTask(task.id));
            
            taskList.appendChild(taskItem);
        });
    }
    
    // Toggle task complete status
    function toggleTaskComplete(taskId) {
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            saveTasks();
            renderTasks();
        }
    }
    
    // Delete task
    function deleteTask(taskId) {
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasks();
        renderTasks();
    }
    
    // Check for PWA install prompt
    function checkPWAInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install prompt
            const installPrompt = document.createElement('div');
            installPrompt.className = 'install-prompt';
            installPrompt.innerHTML = `
                <span>Установить FocusFlow как приложение?</span>
                <button id="install-btn">Установить</button>
                <button class="secondary" id="dismiss-btn">Позже</button>
            `;
            
            document.body.appendChild(installPrompt);
            
            document.getElementById('install-btn').addEventListener('click', () => {
                installPrompt.style.display = 'none';
                deferredPrompt.prompt();
                
                deferredPrompt.userChoice.then(choiceResult => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    } else {
                        console.log('User dismissed the install prompt');
                    }
                    deferredPrompt = null;
                });
            });
            
            document.getElementById('dismiss-btn').addEventListener('click', () => {
                installPrompt.style.display = 'none';
            });
        });
    }
    
    // Initialize the app
    init();
});