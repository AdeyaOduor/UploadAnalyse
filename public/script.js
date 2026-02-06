document.getElementById('uploadBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please upload a CSV file.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Send the CSV file to the server
    const response = await fetch('/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        alert('Error uploading file.');
        return;
    }

    const salesData = await response.json();
    const analysisResults = performAnalytics(salesData);
    
    createChart(analysisResults);
});

function performAnalytics(data) {
    const aggregatedData = data.reduce((acc, sale) => {
        const date = new Date(sale.date).toLocaleDateString(); // Format date
        if (!acc[date]) {
            acc[date] = { quantity: 0, revenue: 0 };
        }
        acc[date].quantity += sale.quantity;
        acc[date].revenue += sale.revenue;
        return acc;
    }, {});

    // Descriptive analytics
    const totalQuantity = Object.values(aggregatedData).reduce((sum, entry) => sum + entry.quantity, 0);
    const totalRevenue = Object.values(aggregatedData).reduce((sum, entry) => sum + entry.revenue, 0);

    // Predictive analytics (e.g., moving average)
    const predictions = calculateMovingAverage(aggregatedData);

    return {
        aggregatedData,
        totalQuantity,
        totalRevenue,
        predictions
    };
}

function calculateMovingAverage(data) {
    const dates = Object.keys(data);
    const movingAverage = [];
    
    dates.forEach((date, index) => {
        const sum = (data[dates[index - 1]]?.quantity || 0) + (data[dates[index]]?.quantity || 0) + (data[dates[index + 1]]?.quantity || 0);
        const avg = sum / 3; // Simple moving average of last 3 entries
        movingAverage.push({ date, avg });
    });

    return movingAverage;
}

function createChart({ aggregatedData, predictions }) {
    const labels = Object.keys(aggregatedData);
    const quantities = Object.values(aggregatedData).map(entry => entry.quantity);
    const predictionValues = predictions.map(entry => entry.avg);

    const ctx = document.getElementById('salesChart').getContext('2d');
    const salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Quantity Sold',
                    data: quantities,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Predicted Quantity Sold (Moving Average)',
                    data: predictionValues,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}