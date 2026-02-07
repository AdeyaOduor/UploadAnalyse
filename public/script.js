// Store chart instances
let chartInstances = {
    quantityChart: null,
    revenueChart: null,
    combinedChart: null
};

// Initialize event listener
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('uploadBtn').addEventListener('click', handleUpload);
});

async function handleUpload() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    const loadingElement = document.getElementById('loading');
    const messageElement = document.getElementById('message');
    const analyticsSummary = document.getElementById('analyticsSummary');
    const chartsContainer = document.getElementById('chartsContainer');

    // Reset UI
    messageElement.textContent = '';
    messageElement.className = 'message';
    analyticsSummary.style.display = 'none';
    chartsContainer.style.display = 'none';
    
    if (!file) {
        showMessage('Please select a CSV file first.', 'error');
        return;
    }

    // Show loading
    loadingElement.style.display = 'block';
    
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Upload failed');
        }

        if (!result.success) {
            throw new Error(result.error || 'Processing failed');
        }

        // Show success message
        showMessage('File uploaded and analyzed successfully!', 'success');
        
        // Visualize the data
        visualizeData(result.data);
        
        // Display analytics
        displayAnalyticsSummary(result.analytics, result.data);
        
        // Show containers
        analyticsSummary.style.display = 'block';
        chartsContainer.style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        showMessage('Error: ' + error.message, 'error');
    } finally {
        loadingElement.style.display = 'none';
    }
}

function showMessage(text, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = text;
    messageElement.className = `message ${type}`;
}

function visualizeData(salesData) {
    console.log('Visualizing data:', salesData);
    
    if (!salesData || salesData.length === 0) {
        showMessage('No valid data found in CSV file.', 'error');
        return;
    }
    
    // Destroy existing charts
    destroyExistingCharts();
    
    // Create charts
    createQuantityChart(salesData);
    createRevenueChart(salesData);
    createCombinedChart(salesData);
}

function destroyExistingCharts() {
    Object.keys(chartInstances).forEach(chartName => {
        if (chartInstances[chartName]) {
            chartInstances[chartName].destroy();
            chartInstances[chartName] = null;
        }
    });
}

function createQuantityChart(data) {
    const ctx = document.getElementById('quantityChart');
    if (!ctx) return;
    
    const dates = data.map(item => 
        formatDate(item.date)
    );
    
    const quantities = data.map(item => item.quantity);
    
    chartInstances.quantityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Quantity Sold',
                data: quantities,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 3,
                tension: 0.2,
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                pointRadius: 5,
                pointHoverRadius: 8,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Quantity: ${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#666'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity',
                        color: '#666'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function createRevenueChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    const dates = data.map(item => 
        formatDate(item.date)
    );
    
    const revenues = data.map(item => item.revenue);
    
    chartInstances.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Revenue',
                data: revenues,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 3,
                tension: 0.2,
                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                pointRadius: 5,
                pointHoverRadius: 8,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Revenue: $${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#666'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Revenue ($)',
                        color: '#666'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function createCombinedChart(data) {
    const ctx = document.getElementById('combinedChart');
    if (!ctx) return;
    
    const dates = data.map(item => 
        formatDate(item.date, true)
    );
    
    const quantities = data.map(item => item.quantity);
    const revenues = data.map(item => item.revenue);
    
    chartInstances.combinedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Quantity',
                    data: quantities,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y',
                    tension: 0.2
                },
                {
                    label: 'Revenue ($)',
                    data: revenues,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y1',
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label.includes('Revenue')) {
                                label += ': $' + context.parsed.y.toLocaleString();
                            } else {
                                label += ': ' + context.parsed.y.toLocaleString();
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#666'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantity',
                        color: '#36a2eb'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Revenue ($)',
                        color: '#ff6384'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });
}

function formatDate(date, short = false) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    
    if (short) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function displayAnalyticsSummary(analytics, data) {
    const summaryDiv = document.getElementById('analyticsSummary');
    if (!summaryDiv) return;
    
    // Calculate additional metrics
    const totalDays = data.length;
    const avgPricePerUnit = analytics.totalQuantity > 0 ? 
        (analytics.totalRevenue / analytics.totalQuantity).toFixed(2) : 0;
    
    summaryDiv.innerHTML = `
        <div class="analytics-summary">
            <h3>📈 Analytics Summary</h3>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Total Quantity</div>
                    <div class="metric-value">${analytics.totalQuantity.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Total Revenue</div>
                    <div class="metric-value">$${analytics.totalRevenue.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Avg Daily Quantity</div>
                    <div class="metric-value">${analytics.avgQuantity.toFixed(1)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Avg Daily Revenue</div>
                    <div class="metric-value">$${analytics.avgRevenue.toFixed(0)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Avg Price/Unit</div>
                    <div class="metric-value">$${avgPricePerUnit}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Data Points</div>
                    <div class="metric-value">${totalDays}</div>
                </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div>
                        <strong>Quantity Range:</strong> ${analytics.minQuantity} - ${analytics.maxQuantity}
                    </div>
                    <div>
                        <strong>Revenue Range:</strong> $${analytics.minRevenue.toLocaleString()} - $${analytics.maxRevenue.toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Add sample data generation for testing
document.addEventListener('DOMContentLoaded', function() {
    // Add sample CSV button
    const uploadSection = document.querySelector('.upload-section');
    const sampleBtn = document.createElement('button');
    sampleBtn.id = 'sampleBtn';
    sampleBtn.textContent = '📋 Download Sample CSV';
    sampleBtn.style.backgroundColor = 'rgba(155, 89, 182, 0.8)';
    sampleBtn.style.marginLeft = '10px';
    
    sampleBtn.addEventListener('click', function() {
        const sampleCSV = `Date,Quantity,Revenue
2023-01-01,10,1200
2023-01-02,15,1800
2023-01-03,8,960
2023-01-04,12,1440
2023-01-05,20,2400
2023-01-06,18,2160
2023-01-07,14,1680
2023-01-08,22,2640
2023-01-09,16,1920
2023-01-10,11,1320`;
        
        const blob = new Blob([sampleCSV], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_sales_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    });
    
    uploadSection.appendChild(sampleBtn);
});