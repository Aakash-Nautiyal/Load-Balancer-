class LoadBalancer {
    constructor() {
        this.config = {
            servers: [],
            algorithm: 'roundRobin',
            requestRate: 5,
            simulationRunning: false,
            totalRequests: 0,
            nextServerIndex: 0,
            logEntries: []
        };
        
        this.initElements();
        this.initEventListeners();
        this.initializeServers(3);
        this.updateUI();
        this.startHealthMonitoring();
    }
    
    initElements() {
        this.elements = {
            startStopBtn: document.getElementById('startStop'),
            requestRateInput: document.getElementById('requestRate'),
            rateValue: document.getElementById('rateValue'),
            algorithmSelect: document.getElementById('algorithm'),
            addServerBtn: document.getElementById('addServer'),
            removeServerBtn: document.getElementById('removeServer'),
            clearLogBtn: document.getElementById('clearLog'),
            serverGrid: document.getElementById('serverGrid'),
            totalRequests: document.getElementById('totalRequests'),
            activeConnections: document.getElementById('activeConnections'),
            healthyServers: document.getElementById('healthyServers'),
            totalServers: document.getElementById('totalServers'),
            distributionChart: document.getElementById('distributionChart'),
            healthLog: document.getElementById('healthLog')
        };
    }
    
    initEventListeners() {
        this.elements.startStopBtn.addEventListener('click', () => this.toggleSimulation());
        this.elements.requestRateInput.addEventListener('input', () => {
            this.config.requestRate = parseInt(this.elements.requestRateInput.value);
            this.elements.rateValue.textContent = this.config.requestRate;
        });
        this.elements.algorithmSelect.addEventListener('change', () => {
            this.config.algorithm = this.elements.algorithmSelect.value;
        });
        this.elements.addServerBtn.addEventListener('click', () => this.addServer());
        this.elements.removeServerBtn.addEventListener('click', () => this.removeServer());
        this.elements.clearLogBtn.addEventListener('click', () => this.clearLog());
    }
    
    initializeServers(count) {
        for (let i = 0; i < count; i++) {
            this.addServer();
        }
    }
    
    addServer() {
        const serverNumber = this.config.servers.length + 1;
        const newServer = {
            id: serverNumber,
            name: `Server ${serverNumber}`,
            connections: 0,
            maxConnections: 10,
            health: 100,
            latency: 20,
            packetLoss: 0,
            status: 'online',
            lastHealthCheck: Date.now()
        };
        
        this.config.servers.push(newServer);
        this.updateUI();
        this.addLogEntry(`Server ${serverNumber} added to the pool`, 'success');
    }
    
    removeServer() {
        if (this.config.servers.length > 1) {
            const removedServer = this.config.servers.pop();
            this.addLogEntry(`Server ${removedServer.id} removed from the pool`, 'warning');
            
            // Renumber remaining servers to maintain sequential numbering
            this.config.servers.forEach((server, index) => {
                server.id = index + 1;
                server.name = `Server ${server.id}`;
            });
            
            this.updateUI();
        } else {
            this.addLogEntry('Cannot remove the last server', 'error');
        }
    }
    
    toggleServerStatus(serverId) {
        const server = this.config.servers.find(s => s.id === serverId);
        if (server) {
            server.status = server.status === 'online' ? 'offline' : 'online';
            server.health = server.status === 'online' ? 80 : 0;
            this.updateServerMetrics(server);
            
            const action = server.status === 'online' ? 'started' : 'stopped';
            this.addLogEntry(`Server ${serverId} ${action}`, 
                            server.status === 'online' ? 'success' : 'error');
            this.updateUI();
        }
    }
    
    startHealthMonitoring() {
        setInterval(() => {
            this.config.servers.forEach(server => {
                if (server.status === 'offline') return;
                
                const previousHealth = server.health;
                const previousStatus = this.getHealthStatus(previousHealth);
                
                // Simulate health changes (more likely to degrade than improve)
                const healthChange = (Math.random() * 15) - (server.connections / 2);
                server.health = Math.max(0, Math.min(100, server.health + healthChange));
                
                // Update network metrics based on health and load
                server.latency = 20 + (100 - server.health) * 2 + (server.connections * 3);
                server.packetLoss = (100 - server.health) * 0.15 + (server.connections * 0.1);
                server.lastHealthCheck = Date.now();
                
                // Log significant health changes
                const currentStatus = this.getHealthStatus(server.health);
                if (currentStatus !== previousStatus) {
                    this.addLogEntry(
                        `${server.name} health changed to ${currentStatus} (${Math.round(server.health)}%)`,
                        this.getHealthClass(server.health)
                    );
                }
                
                // Log critical status changes
                if (previousHealth >= 50 && server.health < 50) {
                    this.addLogEntry(`${server.name} health became CRITICAL`, 'error');
                } else if (previousHealth < 50 && server.health >= 50) {
                    this.addLogEntry(`${server.name} recovered from critical status`, 'success');
                }
            });
            
            this.updateUI();
        }, 3000);
    }
    
    startSimulation() {
        if (this.config.simulationRunning) return;
        
        this.config.simulationRunning = true;
        this.elements.startStopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Simulation';
        this.addLogEntry('Simulation started', 'success');
        
        const processRequest = () => {
            if (!this.config.simulationRunning) return;
            
            const now = Date.now();
            if (now - this.lastRequestTime >= 1000 / this.config.requestRate) {
                this.dispatchRequest();
                this.lastRequestTime = now;
            }
            
            requestAnimationFrame(processRequest);
        };
        
        this.lastRequestTime = Date.now();
        processRequest();
    }
    
    stopSimulation() {
        this.config.simulationRunning = false;
        this.elements.startStopBtn.innerHTML = '<i class="fas fa-play"></i> Start Simulation';
        this.addLogEntry('Simulation stopped', 'warning');
    }
    
    toggleSimulation() {
        if (this.config.simulationRunning) {
            this.stopSimulation();
        } else {
            this.startSimulation();
        }
    }
    
    dispatchRequest() {
        const server = this.getNextServer();
        
        if (server) {
            server.connections++;
            this.config.totalRequests++;
            
            // Simulate request processing time based on server health and load
            const processingTime = 800 + (Math.random() * 2400) + 
                                 ((100 - server.health) * 10) + 
                                 (server.connections * 50);
            
            setTimeout(() => {
                server.connections--;
                this.updateUI();
            }, processingTime);
            
            this.updateUI();
        } else {
            this.addLogEntry('No healthy servers available to handle request', 'error');
        }
    }
    
    getNextServer() {
        const onlineServers = this.config.servers.filter(s => s.status === 'online');
        const healthyServers = onlineServers.filter(s => s.health >= 50);
        
        if (healthyServers.length === 0) return null;
        
        if (this.config.algorithm === 'leastConnections') {
            return healthyServers.reduce((prev, current) => 
                (prev.connections < current.connections) ? prev : current);
        }
        
        // Default to Round Robin
        const nextIndex = this.config.nextServerIndex % healthyServers.length;
        this.config.nextServerIndex = (this.config.nextServerIndex + 1) % healthyServers.length;
        return healthyServers[nextIndex];
    }
    
    updateUI() {
        this.updateServerGrid();
        this.updateStats();
        this.updateDistributionChart();
    }
    
    updateServerGrid() {
        this.elements.serverGrid.innerHTML = '';
        
        this.config.servers.forEach(server => {
            const healthClass = server.status === 'offline' ? 'offline' : this.getHealthClass(server.health);
            const connectionPercentage = (server.connections / server.maxConnections) * 100;
            const loadPercentage = Math.min(100, connectionPercentage);
            
            const serverCard = document.createElement('div');
            serverCard.className = `server-card ${healthClass}`;
            serverCard.innerHTML = `
                <div class="server-header">
                    <div class="server-title">
                        <span class="server-status"></span>
                        <span class="server-name">${server.name}</span>
                    </div>
                    <div class="server-health">${server.status === 'offline' ? 'OFFLINE' : Math.round(server.health) + '%'}</div>
                </div>
                
                <div class="server-metrics">
                    <div class="metric">
                        <span class="metric-label">Status</span>
                        <span class="metric-value">${server.status.toUpperCase()}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Connections</span>
                        <span class="metric-value">${server.connections}/${server.maxConnections}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Latency</span>
                        <span class="metric-value">${server.latency.toFixed(2)}ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Packet Loss</span>
                        <span class="metric-value">${server.packetLoss.toFixed(2)}%</span>
                    </div>
                </div>
                
                <div class="connection-meter">
                    <div class="connection-label">
                        <span>Load</span>
                        <span>${loadPercentage.toFixed(1)}%</span>
                    </div>
                    <div class="meter-bar">
                        <div class="meter-fill" style="width: ${loadPercentage}%"></div>
                    </div>
                </div>
                
                <div class="server-actions">
                    <button class="btn btn-small toggle-server" data-id="${server.id}">
                        <i class="fas fa-power-off"></i> ${server.status === 'online' ? 'Stop' : 'Start'}
                    </button>
                    ${server.status === 'online' && server.health < 50 ? `
                    <button class="btn btn-small btn-warning restart-server" data-id="${server.id}">
                        <i class="fas fa-sync-alt"></i> Restart
                    </button>
                    ` : ''}
                </div>
            `;
            
            this.elements.serverGrid.appendChild(serverCard);
        });
        
        // Add event listeners to the new buttons
        document.querySelectorAll('.toggle-server').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const serverId = parseInt(e.target.closest('button').dataset.id);
                this.toggleServerStatus(serverId);
            });
        });
        
        document.querySelectorAll('.restart-server').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const serverId = parseInt(e.target.closest('button').dataset.id);
                this.restartServer(serverId);
            });
        });
    }
    
    restartServer(serverId) {
        const server = this.config.servers.find(s => s.id === serverId);
        if (server && server.status === 'online') {
            server.health = 80; // Partial recovery
            server.latency = 50;
            server.packetLoss = 1;
            this.addLogEntry(`Server ${serverId} restarted - recovering`, 'warning');
            this.updateUI();
        }
    }
    
    updateStats() {
        this.elements.totalRequests.textContent = this.config.totalRequests;
        
        const activeConnections = this.config.servers.reduce((sum, server) => 
            sum + server.connections, 0);
        this.elements.activeConnections.textContent = activeConnections;
        
        const healthyCount = this.config.servers.filter(s => 
            s.status === 'online' && s.health >= 50).length;
        this.elements.healthyServers.textContent = healthyCount;
        
        this.elements.totalServers.textContent = this.config.servers.length;
    }
    
    updateDistributionChart() {
        this.elements.distributionChart.innerHTML = '';
        
        const maxRequests = Math.max(1, ...this.config.servers.map(s => s.connections));
        const totalRequests = this.config.servers.reduce((sum, server) => sum + server.connections, 0);
        
        this.config.servers.forEach(server => {
            const percentage = totalRequests > 0 ? (server.connections / totalRequests) * 100 : 0;
            const height = totalRequests > 0 ? (server.connections / maxRequests) * 100 : 0;
            
            const bar = document.createElement('div');
            bar.className = 'distribution-bar';
            bar.style.height = `${height}%`;
            bar.setAttribute('data-label', `${server.name}: ${server.connections} (${percentage.toFixed(1)}%)`);
            
            // Color based on health/status
            if (server.status === 'offline') {
                bar.style.backgroundColor = 'var(--offline)';
            } else if (server.health >= 90) {
                bar.style.backgroundColor = 'var(--excellent)';
            } else if (server.health >= 75) {
                bar.style.backgroundColor = 'var(--success)';
            } else if (server.health >= 50) {
                bar.style.backgroundColor = 'var(--warning)';
            } else {
                bar.style.backgroundColor = 'var(--danger)';
            }
            
            this.elements.distributionChart.appendChild(bar);
        });
    }
    
    addLogEntry(message, type = 'info') {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="timestamp">${timeString}</span>
            <span class="message">${message}</span>
        `;
        
        this.elements.healthLog.insertBefore(logEntry, this.elements.healthLog.firstChild);
        
        // Keep log to 100 entries max
        if (this.elements.healthLog.children.length > 100) {
            this.elements.healthLog.removeChild(this.elements.healthLog.lastChild);
        }
    }
    
    clearLog() {
        this.elements.healthLog.innerHTML = '';
        this.addLogEntry('Log cleared', 'warning');
    }
    
    getHealthStatus(health) {
        if (health >= 90) return 'EXCELLENT';
        if (health >= 75) return 'GOOD';
        if (health >= 50) return 'WARNING';
        return 'CRITICAL';
    }
    
    getHealthClass(health) {
        if (health >= 90) return 'excellent';
        if (health >= 75) return 'good';
        if (health >= 50) return 'warning';
        return 'critical';
    }
    
    updateServerMetrics(server) {
        if (server.status === 'offline') {
            server.latency = 0;
            server.packetLoss = 100;
        } else {
            server.latency = 20 + (100 - server.health) * 2 + (server.connections * 3);
            server.packetLoss = (100 - server.health) * 0.15 + (server.connections * 0.1);
        }
    }
}

// Initialize the load balancer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const loadBalancer = new LoadBalancer();
});